/**
 * content.js — Forex Hover Pro page runtime.
 *
 *  - TreeWalker price detection + MutationObserver for dynamic content
 *  - Optional selected-text conversion and optional underlines (settings)
 *  - Reacts to chrome.storage changes, so popup/options never need `tabs`
 *  - Guards every runtime call against extension-context invalidation
 */
import { normalizeAppearance } from "./src/ui/appearance.ts";

(() => {
  const DEBOUNCE_MS = 250;
  const PRICE_ATTR = "data-fhp";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "CANVAS", "INPUT", "TEXTAREA", "SELECT", "CODE", "PRE"]);
  const UNDERLINE = "cursor:help;border-bottom:1px dashed color-mix(in srgb, currentColor 45%, transparent);transition:background .15s ease;border-radius:2px;";
  const PLAIN = "cursor:help;transition:background .15s ease;border-radius:2px;";

  const state = {
    enabled: true,
    selectionMode: true,
    underline: true,
    targetCurrencies: ["USD", "EUR", "GBP"]
  };
  let observer = null;
  let debounceTimer = null;
  const pendingNodes = new Set();
  let selectionTimeout = null;
  let contextAlive = true;

  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function handleContextLost() {
    if (!contextAlive) return;
    contextAlive = false;
    stopObserver();
    window.ForexTooltip?.hide();
  }

  function applyPrefs(prefs) {
    if ("enabled" in prefs) state.enabled = prefs.enabled !== false;
    if ("selectionMode" in prefs) state.selectionMode = prefs.selectionMode !== false;
    if ("underline" in prefs) state.underline = prefs.underline !== false;
    if (Array.isArray(prefs.targetCurrencies) && prefs.targetCurrencies.length) {
      state.targetCurrencies = prefs.targetCurrencies;
    } else if (typeof prefs.targetCurrency === "string") {
      state.targetCurrencies = [prefs.targetCurrency];
    }
  }

  async function init() {
    if (!isContextValid()) return;
    try {
      const prefs = await chrome.storage.sync.get([
        "enabled", "selectionMode", "underline", "targetCurrencies", "targetCurrency", "appearance"
      ]);
      applyPrefs(prefs);
      window.ForexTooltip.setAppearance(normalizeAppearance(prefs.appearance));
    } catch (err) {
      if (err.message?.includes("Extension context invalidated")) return handleContextLost();
      throw err;
    }
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    chrome.storage.onChanged.addListener(onStorageChanged);
    if (state.enabled) start();
  }

  function start() {
    scanSubtree(document.body);
    startObserver();
  }

  function restart() {
    stopObserver();
    unwrapAll();
    if (state.enabled) start();
  }

  function onStorageChanged(changes, area) {
    if (area !== "sync" || !contextAlive) return;
    if (changes.appearance) window.ForexTooltip.setAppearance(normalizeAppearance(changes.appearance.newValue));
    const relevant = ["enabled", "targetCurrencies", "underline", "selectionMode"].filter((k) => k in changes);
    if (!relevant.length) return;
    applyPrefs(Object.fromEntries(relevant.map((k) => [k, changes[k].newValue])));
    if (relevant.some((k) => k !== "selectionMode")) restart();
  }

  // ─── Rates ────────────────────────────────────────────────────────────────
  async function fetchRatesMulti(base) {
    const targets = state.targetCurrencies.filter((c) => c !== base);
    const same = () => ({ success: true, rate: 1, timestamp: Date.now() });
    if (!targets.length) return { rates: Object.fromEntries(state.targetCurrencies.map((c) => [c, same()])) };
    if (!isContextValid()) {
      handleContextLost();
      throw new Error("CONTEXT_LOST");
    }
    const result = await chrome.runtime.sendMessage({ type: "GET_RATES_MULTI", base, targets });
    if (!result?.success) throw new Error(result?.error || "Rates unavailable");
    const rates = {};
    for (const c of targets) rates[c] = result.rates[c];
    return { rates, stale: result.stale, source: result.source };
  }

  async function showConversion({ amount, baseCurrency, anchorOrCoords, isSelection }) {
    if (!isContextValid()) return handleContextLost();
    window.ForexTooltip.showLoading(anchorOrCoords);
    try {
      const { rates, stale, source } = await fetchRatesMulti(baseCurrency);
      window.ForexTooltip.showMultiResult({ amount, originalCurrency: baseCurrency, rates, isSelection: !!isSelection, stale, source });
    } catch (err) {
      if (err.message === "CONTEXT_LOST" || err.message?.includes("Extension context invalidated")) {
        handleContextLost();
        return window.ForexTooltip?.hide();
      }
      window.ForexTooltip.showError("Rates unavailable — check your connection");
    }
  }

  // ─── Hover ────────────────────────────────────────────────────────────────
  function onPriceMouseEnter(event) {
    if (!state.enabled || !contextAlive) return;
    const span = event.currentTarget;
    span.style.background = "color-mix(in srgb, currentColor 10%, transparent)";
    showConversion({
      amount: parseFloat(span.getAttribute("data-fhp-amount")),
      baseCurrency: span.getAttribute("data-fhp-currency"),
      anchorOrCoords: span,
      isSelection: false
    });
  }

  function onPriceMouseLeave(event) {
    event.currentTarget.style.background = "";
    window.ForexTooltip.hide();
  }

  // ─── Selection ────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (e.target.closest?.("[data-fhp-host]")) return;
    clearTimeout(selectionTimeout);
    window.ForexTooltip.hide();
  }

  function onMouseUp(event) {
    if (!state.enabled || !state.selectionMode || !contextAlive) return;
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => handleSelection(event.clientX, event.clientY), 80);
  }

  function handleSelection(x, y) {
    const text = window.getSelection()?.toString().trim();
    if (!text || text.length < 2) return;
    const [price] = window.PriceDetector.detect(text);
    if (!price) return;
    showConversion({ amount: price.amount, baseCurrency: price.currency, anchorOrCoords: { x, y }, isSelection: true });
  }

  // ─── DOM scan ─────────────────────────────────────────────────────────────
  // ponytail: still wraps prices in spans; pointer/caret detection (M4-T1) replaces this.
  function scanSubtree(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        const parent = textNode.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || parent.hasAttribute(PRICE_ATTR)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-fhp-host],[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
        return textNode.nodeValue?.trim().length >= 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(processTextNode);
  }

  function processTextNode(textNode) {
    const text = textNode.nodeValue;
    const parent = textNode.parentElement;
    if (!text || !parent) return;
    const prices = window.PriceDetector.detect(text);
    if (!prices.length) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    for (const price of prices) {
      if (state.targetCurrencies.every((c) => c === price.currency)) continue;
      if (price.index > lastIndex) fragment.append(text.slice(lastIndex, price.index));
      const span = document.createElement("span");
      span.setAttribute(PRICE_ATTR, "true");
      span.setAttribute("data-fhp-amount", price.amount);
      span.setAttribute("data-fhp-currency", price.currency);
      span.style.cssText = state.underline ? UNDERLINE : PLAIN;
      span.textContent = price.raw;
      span.addEventListener("mouseenter", onPriceMouseEnter);
      span.addEventListener("mouseleave", onPriceMouseLeave);
      fragment.append(span);
      lastIndex = price.index + price.length;
    }
    if (!lastIndex) return;
    if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
    parent.replaceChild(fragment, textNode);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) for (const node of m.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) pendingNodes.add(node);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!state.enabled || !contextAlive) return;
        pendingNodes.forEach(scanSubtree);
        pendingNodes.clear();
      }, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
    clearTimeout(debounceTimer);
    pendingNodes.clear();
  }

  function unwrapAll() {
    document.querySelectorAll(`[${PRICE_ATTR}]`).forEach((span) => span.replaceWith(span.textContent));
    window.ForexTooltip.hide();
  }

  init();
})();
