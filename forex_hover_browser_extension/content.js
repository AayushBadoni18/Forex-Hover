/**
 * content.js — Forex Hover Pro (Final)
 *
 * Features:
 *  - TreeWalker price detection + MutationObserver for dynamic content
 *  - Text selection detection (mouseup → detect → tooltip at cursor)
 *  - Multi-currency tooltip via parallel background fetches
 *
 * Fix: Extension context invalidation guard.
 *   When Chrome reloads/updates the extension, or the MV3 service worker
 *   idles and Chrome tears down the context, chrome.runtime.id becomes
 *   undefined. We check this BEFORE every sendMessage call and handle
 *   it silently instead of throwing an uncaught error.
 */

(async () => {

  const DEBOUNCE_MS = 250;
  const PRICE_ATTR  = "data-fhp";

  const SKIP_TAGS = new Set([
    "SCRIPT","STYLE","NOSCRIPT","IFRAME","CANVAS",
    "INPUT","TEXTAREA","SELECT","CODE","PRE",
  ]);

  // ─── State ───────────────────────────────────────────────────────────────────
  let enabled          = true;
  let targetCurrencies = ["USD"];
  let observer         = null;
  let debounceTimer    = null;
  let pendingNodes     = new Set();
  let selectionTimeout = null;
  let contextAlive     = true; // flips false once invalidation is detected

  // ─── Context validity guard ──────────────────────────────────────────────────
  /**
   * Returns true if the extension runtime context is still valid.
   *
   * chrome.runtime.id is set by Chrome when the content script is injected.
   * When the extension is reloaded, updated, or the MV3 service worker is
   * killed by the browser, runtime.id becomes undefined. Checking this before
   * any chrome.runtime.sendMessage call prevents the
   * "Extension context invalidated" error from surfacing as an uncaught exception.
   */
  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  /**
   * Called once context loss is confirmed. Tears down observers and hides
   * any visible tooltip. Leaves annotated spans in place to avoid a jarring
   * page re-render. The user needs to refresh to reconnect.
   */
  function handleContextLost() {
    if (!contextAlive) return;
    contextAlive = false;
    stopObserver();
    window.ForexTooltip?.hide();
    console.info("[ForexHoverPro] Extension context lost — refresh the page to reconnect.");
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    if (!isContextValid()) return;

    try {
      const prefs = await chrome.storage.sync.get(["enabled", "targetCurrencies", "targetCurrency"]);
      enabled = prefs.enabled !== false;

      if (prefs.targetCurrencies?.length > 0) {
        targetCurrencies = prefs.targetCurrencies;
      } else if (prefs.targetCurrency) {
        targetCurrencies = [prefs.targetCurrency];
      }
    } catch (err) {
      if (err.message?.includes("Extension context invalidated")) {
        handleContextLost();
        return;
      }
      throw err;
    }

    if (!enabled) return;

    scanSubtree(document.body);
    startObserver();
    attachSelectionListener();
  }

  // ─── Multi-rate fetcher ──────────────────────────────────────────────────────
  async function fetchRatesMulti(baseCurrency) {
    const targets = targetCurrencies.filter(c => c !== baseCurrency);

    if (targets.length === 0) {
      const ts = Date.now();
      return Object.fromEntries(
        targetCurrencies.map(c => [c, { success: true, rate: 1, timestamp: ts }])
      );
    }

    // Guard before every sendMessage
    if (!isContextValid()) {
      handleContextLost();
      throw new Error("CONTEXT_LOST");
    }

    const result = await chrome.runtime.sendMessage({
      type: "GET_RATES_MULTI",
      base: baseCurrency,
      targets,
    });

    if (!result.success) throw new Error(result.error || "Failed to fetch rates");

    const rates = { ...result.rates };
    targetCurrencies
      .filter(c => c === baseCurrency)
      .forEach(c => { rates[c] = { success: true, rate: 1, timestamp: Date.now() }; });

    return rates;
  }

  // ─── Core: show conversion tooltip ──────────────────────────────────────────
  async function showConversion({ amount, baseCurrency, anchorOrCoords, isSelection }) {
    // Primary guard — bail immediately if context is already gone
    if (!isContextValid()) {
      handleContextLost();
      return;
    }

    window.ForexTooltip.showLoading(anchorOrCoords);

    try {
      const rates = await fetchRatesMulti(baseCurrency);

      window.ForexTooltip.showMultiResult({
        amount,
        originalCurrency: baseCurrency,
        rates,
        isSelection: !!isSelection,
      });

    } catch (err) {
      // Silently swallow context-lost errors — they are expected after extension
      // reload / service worker eviction and are not actionable by the user.
      if (
        err.message === "CONTEXT_LOST" ||
        err.message?.includes("Extension context invalidated")
      ) {
        handleContextLost();
        window.ForexTooltip?.hide();
        return;
      }

      // Show legitimate errors (missing API key, network failure, etc.)
      const msg = err.message?.includes("API key")
        ? "Add your API key in background.js"
        : err.message || "Rate unavailable";

      window.ForexTooltip.showError(msg);
      console.error("[ForexHoverPro]", err);
    }
  }

  // ─── Hover handlers ──────────────────────────────────────────────────────────
  async function onPriceMouseEnter(event) {
    if (!enabled || !contextAlive) return;
    const span         = event.currentTarget;
    const amount       = parseFloat(span.getAttribute("data-fhp-amount"));
    const baseCurrency = span.getAttribute("data-fhp-currency");
    span.style.background = "rgba(120, 200, 140, 0.12)";
    await showConversion({ amount, baseCurrency, anchorOrCoords: span, isSelection: false });
  }

  function onPriceMouseLeave(event) {
    event.currentTarget.style.background = "";
    window.ForexTooltip.hide();
  }

  // ─── Text selection ──────────────────────────────────────────────────────────
  function attachSelectionListener() {
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("[data-fhp-host]")) {
        clearTimeout(selectionTimeout);
        window.ForexTooltip.hide();
      }
    });
  }

  function onMouseUp(event) {
    if (!enabled || !contextAlive) return;
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => handleSelection(event.clientX, event.clientY), 80);
  }

  function handleSelection(mouseX, mouseY) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text || text.length < 2) return;
    const prices = window.PriceDetector.detect(text);
    if (prices.length === 0) return;
    const price = prices[0];
    showConversion({
      amount: price.amount,
      baseCurrency: price.currency,
      anchorOrCoords: { x: mouseX, y: mouseY },
      isSelection: true,
    });
  }

  // ─── TreeWalker DOM scan ──────────────────────────────────────────────────────
  function scanSubtree(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(textNode) {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.hasAttribute(PRICE_ATTR)) return NodeFilter.FILTER_REJECT;
          const text = textNode.nodeValue;
          if (!text || text.trim().length < 2) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(processTextNode);
  }

  function processTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text) return;
    const prices = window.PriceDetector.detect(text);
    if (prices.length === 0) return;
    const parent = textNode.parentElement;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    let lastIndex  = 0;
    let wrappedAny = false;

    for (const price of prices) {
      if (targetCurrencies.every(c => c === price.currency)) continue;
      if (price.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, price.index)));
      }
      const span = document.createElement("span");
      span.setAttribute(PRICE_ATTR, "true");
      span.setAttribute("data-fhp-amount", price.amount);
      span.setAttribute("data-fhp-currency", price.currency);
      span.style.cssText = "cursor:help;border-bottom:1px dashed rgba(120,200,140,0.45);border-radius:2px;transition:background 0.15s ease;";
      span.textContent = price.raw;
      span.addEventListener("mouseenter", onPriceMouseEnter);
      span.addEventListener("mouseleave", onPriceMouseLeave);
      fragment.appendChild(span);
      lastIndex  = price.index + price.length;
      wrappedAny = true;
    }

    if (!wrappedAny) return;
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    if (lastIndex > 0) parent.replaceChild(fragment, textNode);
  }

  // ─── MutationObserver ────────────────────────────────────────────────────────
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) pendingNodes.add(node);
        }
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!enabled || !contextAlive) return;
        pendingNodes.forEach(scanSubtree);
        pendingNodes.clear();
      }, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(debounceTimer);
    pendingNodes.clear();
  }

  function unwrapAll() {
    document.querySelectorAll(`[${PRICE_ATTR}]`).forEach((span) => {
      const text = document.createTextNode(span.textContent);
      span.parentNode?.replaceChild(text, span);
    });
    window.ForexTooltip.destroy();
  }

  // ─── Runtime messages ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (!contextAlive) return;

    if (message.type === "SET_ENABLED") {
      enabled = message.value;
      if (!enabled) {
        stopObserver();
        unwrapAll();
        document.removeEventListener("mouseup", onMouseUp);
      } else {
        scanSubtree(document.body);
        startObserver();
        attachSelectionListener();
      }
    }

    if (message.type === "SET_TARGET_CURRENCIES") {
      targetCurrencies = message.value;
      if (enabled) {
        unwrapAll();
        setTimeout(() => { scanSubtree(document.body); startObserver(); }, 50);
      }
    }

    if (message.type === "SET_TARGET_CURRENCY") {
      targetCurrencies = [message.value];
      if (enabled) {
        unwrapAll();
        setTimeout(() => { scanSubtree(document.body); startObserver(); }, 50);
      }
    }
  });

  // ─── Bootstrap ───────────────────────────────────────────────────────────────
  await init();

})();
