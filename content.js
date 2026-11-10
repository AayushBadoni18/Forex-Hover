/**
 * content.js — Forex Hover Pro page runtime.
 *
 * Detection: the localized parser (src/shared/price-parser.ts) runs on text
 * nodes. A price that fills its element is marked in place (no DOM change);
 * a price inside longer text is wrapped in a span; a price split across
 * elements (Amazon-style `$`<sup>249</sup>`.99`) is found by walking up from
 * the fragments. The currency of ambiguous symbols ($, ¥, kr, £) is resolved
 * from site rules, page language and hostname.
 *
 * Hover uses one delegated listener; underlines are one stylesheet rule.
 */
import { MAX_DOMAIN_OVERRIDES } from "./src/shared/contracts.ts";
import { isCurrencyCode } from "./src/shared/currencies.ts";
import { resolveCurrency } from "./src/shared/currency-resolver.ts";
import { detectPriceCandidates } from "./src/shared/price-parser.ts";
import { normalizeAppearance } from "./src/ui/appearance.ts";

(() => {
  const DEBOUNCE_MS = 200;
  const MARK = "data-fhp-amount";
  const WRAP = "data-fhp-wrap";
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE", "SVG", "CANVAS", "TEMPLATE"]);
  const BLOCKS = /^(DIV|P|LI|TD|TH|TR|TABLE|UL|OL|SECTION|ARTICLE|MAIN|BODY|HTML|FORM|HEADER|FOOTER|NAV|ASIDE)$/;
  const HAS_SIGNAL = /\d|[$€£¥₹₩₺฿₱₫₪₦₴₽৳₨₵]/;

  const state = {
    enabled: true,
    selectionMode: true,
    underline: true,
    targetCurrencies: ["USD", "EUR", "GBP"],
    domainOverrides: {}
  };
  let observer = null;
  let debounceTimer = null;
  const pending = new Set();
  let current = null;
  let selectionTimeout = null;
  let contextAlive = true;

  // ─── Context ──────────────────────────────────────────────────────────────
  const isContextValid = () => {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  };
  function handleContextLost() {
    if (!contextAlive) return;
    contextAlive = false;
    stopObserver();
    window.ForexTooltip?.hide();
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  function applyPrefs(prefs) {
    if ("enabled" in prefs) state.enabled = prefs.enabled !== false;
    if ("selectionMode" in prefs) state.selectionMode = prefs.selectionMode !== false;
    if ("underline" in prefs) state.underline = prefs.underline !== false;
    const targets = Array.isArray(prefs.targetCurrencies) ? prefs.targetCurrencies.filter(isCurrencyCode) : [];
    if (targets.length) state.targetCurrencies = targets;
    else if (isCurrencyCode(prefs.targetCurrency)) state.targetCurrencies = [prefs.targetCurrency];
    if (prefs.domainOverrides && typeof prefs.domainOverrides === "object") {
      state.domainOverrides = Object.fromEntries(
        Object.entries(prefs.domainOverrides).filter(([, c]) => isCurrencyCode(c)).slice(0, MAX_DOMAIN_OVERRIDES)
      );
    }
  }

  function context() {
    return {
      hostname: location.hostname,
      language: document.documentElement.lang || undefined,
      defaultCurrency: state.targetCurrencies[0],
      domainOverrides: state.domainOverrides
    };
  }

  /** Parses text into resolved prices. */
  function detect(text) {
    const ctx = context();
    return detectPriceCandidates(text).map((c) => ({ ...c, ...resolveCurrency(c, ctx) }));
  }

  // ─── Styles (one rule, toggled) ───────────────────────────────────────────
  const style = document.createElement("style");
  function renderStyle() {
    style.textContent = `[${MARK}]{cursor:help;border-radius:3px;transition:background-color .15s ease;${
      state.underline ? "text-decoration:underline dotted color-mix(in srgb,currentColor 55%,transparent);text-decoration-thickness:1.5px;text-underline-offset:3px;" : ""
    }}[${MARK}].fhp-active{background-color:color-mix(in srgb,currentColor 9%,transparent)}`;
    if (!style.isConnected) (document.head || document.documentElement).append(style);
  }

  // ─── Detection ────────────────────────────────────────────────────────────
  function mark(el, price) {
    el.setAttribute(MARK, String(price.amount));
    el.setAttribute("data-fhp-currency", price.currency);
    el.setAttribute("data-fhp-reason", price.reason);
  }

  function wanted(price) {
    return !state.targetCurrencies.every((c) => c === price.currency);
  }

  function processTextNode(node, fragments) {
    const parent = node.parentElement;
    const text = node.nodeValue;
    if (!parent || !text || parent.closest(`[${MARK}]`)) return;
    const prices = detect(text).filter(wanted);
    if (!prices.length) {
      if (text.length <= 24 && HAS_SIGNAL.test(text)) fragments.add(parent);
      return;
    }
    // The price is the element's whole text: mark the element, don't touch the DOM.
    if (prices.length === 1 && parent.childNodes.length === 1 && text.trim() === prices[0].raw.trim() && !BLOCKS.test(parent.tagName)) {
      return mark(parent, prices[0]);
    }
    const fragment = document.createDocumentFragment();
    let last = 0;
    for (const price of prices) {
      if (price.index > last) fragment.append(text.slice(last, price.index));
      const span = document.createElement("span");
      span.setAttribute(WRAP, "");
      span.textContent = price.raw;
      mark(span, price);
      fragment.append(span);
      last = price.index + price.length;
    }
    if (last < text.length) fragment.append(text.slice(last));
    parent.replaceChild(fragment, node);
  }

  /** Element text, reading raised/"cents" digits as the decimal part: $1,299<sup>00</sup> → $1,299.00. */
  function priceText(el) {
    let out = "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.nodeValue;
      const parent = walker.currentNode.parentElement;
      const cents = /^\d{2}$/.test(text.trim()) && /\d$/.test(out) && parent !== el &&
        (parent.tagName === "SUP" || /cent|fraction|decimal/i.test(parent.className));
      out += (cents ? "." : "") + text;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  /** Split prices: walk up from fragments to the smallest inline ancestor whose text is one price. */
  function processFragments(fragments) {
    const done = new Set();
    for (const start of fragments) {
      let el = start;
      for (let depth = 0; el && depth < 4 && !BLOCKS.test(el.tagName); depth++, el = el.parentElement) {
        if (done.has(el) || el.closest(`[${MARK}]`) || el.querySelector(`[${MARK}]`)) break;
        const text = priceText(el);
        if (text.length > 48) break;
        const prices = detect(text);
        if (!prices.length) continue;
        // Repeats are allowed (screen-reader copy + visual copy of the same price).
        const same = prices.every((p) => p.amount === prices[0].amount && p.currency === prices[0].currency);
        const covered = prices[0].raw.replace(/\s/g, "").length / text.replace(/\s/g, "").length;
        if (same && covered >= 0.6 / prices.length && wanted(prices[0])) mark(el, prices[0]);
        done.add(el);
        break;
      }
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE || !root.isConnected) return;
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || SKIP.has(p.tagName.toUpperCase()) || p.isContentEditable || p.closest("[data-fhp-host],[contenteditable='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return HAS_SIGNAL.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const fragments = new Set();
    nodes.forEach((n) => processTextNode(n, fragments));
    processFragments(fragments);
  }

  function unmarkAll() {
    document.querySelectorAll(`[${WRAP}]`).forEach((s) => s.replaceWith(s.textContent));
    document.querySelectorAll(`[${MARK}]`).forEach((el) => {
      el.removeAttribute(MARK);
      el.removeAttribute("data-fhp-currency");
      el.removeAttribute("data-fhp-reason");
      el.classList.remove("fhp-active");
    });
    document.body?.normalize();
    hideTooltip();
  }

  function start() {
    renderStyle();
    scan(document.body);
    startObserver();
  }

  function restart() {
    stopObserver();
    unmarkAll();
    if (state.enabled) start();
    else style.remove();
  }

  // ─── Observer ─────────────────────────────────────────────────────────────
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData") {
          // A price updated in place (SPA): drop the stale mark and rescan that element.
          const host = m.target.parentElement?.closest(`[${MARK}]`);
          if (host && !host.hasAttribute(WRAP)) host.removeAttribute(MARK);
          if (m.target.parentElement) pending.add(m.target.parentElement.parentElement ?? m.target.parentElement);
        } else {
          for (const n of m.addedNodes) {
            if (n.nodeType === Node.ELEMENT_NODE) pending.add(n);
            else if (n.nodeType === Node.TEXT_NODE && n.parentElement) pending.add(n.parentElement);
          }
        }
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!state.enabled || !contextAlive) return;
        const batch = [...pending];
        pending.clear();
        observer.disconnect(); // our own edits must not retrigger the observer
        batch.forEach(scan);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function stopObserver() {
    observer?.disconnect();
    observer = null;
    clearTimeout(debounceTimer);
    pending.clear();
  }

  // ─── Rates + tooltip ──────────────────────────────────────────────────────
  async function fetchRates(base) {
    const targets = state.targetCurrencies.filter((c) => c !== base);
    if (!targets.length) return null;
    if (!isContextValid()) {
      handleContextLost();
      throw new Error("CONTEXT_LOST");
    }
    const result = await chrome.runtime.sendMessage({ type: "GET_RATES_MULTI", base, targets });
    if (!result?.success) throw new Error(result?.error || "Rates unavailable");
    return result;
  }

  let requestId = 0;
  async function showConversion({ amount, currency, reason, anchor, isSelection }) {
    if (!isContextValid()) return handleContextLost();
    const id = ++requestId;
    window.ForexTooltip.showLoading(anchor);
    try {
      const result = await fetchRates(currency);
      if (id !== requestId) return;
      if (!result) return window.ForexTooltip.hide();
      window.ForexTooltip.showMultiResult({
        amount,
        originalCurrency: currency,
        rates: result.rates,
        stale: result.stale,
        source: result.source,
        isSelection,
        reason
      });
    } catch (err) {
      if (id !== requestId) return;
      if (err.message === "CONTEXT_LOST" || err.message?.includes("Extension context invalidated")) {
        handleContextLost();
        return window.ForexTooltip?.hide();
      }
      window.ForexTooltip.showError("Rates unavailable. Check your connection.");
    }
  }

  function hideTooltip() {
    current?.classList.remove("fhp-active");
    current = null;
    requestId++;
    window.ForexTooltip?.hide();
  }

  function onMouseOver(e) {
    if (!state.enabled || !contextAlive) return;
    const el = e.target.closest?.(`[${MARK}]`);
    if (!el || el === current) return;
    hideTooltip();
    current = el;
    el.classList.add("fhp-active");
    showConversion({
      amount: Number(el.getAttribute(MARK)),
      currency: el.getAttribute("data-fhp-currency"),
      reason: el.getAttribute("data-fhp-reason"),
      anchor: el,
      isSelection: false
    });
  }

  function onMouseOut(e) {
    if (current && !current.contains(e.relatedTarget)) hideTooltip();
  }

  // ─── Selection ────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    if (e.target.closest?.("[data-fhp-host]")) return;
    clearTimeout(selectionTimeout);
    if (!current) window.ForexTooltip?.hide();
  }

  function onMouseUp(e) {
    if (!state.enabled || !state.selectionMode || !contextAlive) return;
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      const text = window.getSelection()?.toString().replace(/\s+/g, " ").trim();
      if (!text || text.length < 2 || text.length > 500) return;
      const [price] = detect(text);
      if (!price) return;
      showConversion({ amount: price.amount, currency: price.currency, reason: price.reason, anchor: { x: e.clientX, y: e.clientY }, isSelection: true });
    }, 80);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function onStorageChanged(changes, area) {
    if (area !== "sync" || !contextAlive) return;
    if (changes.appearance) window.ForexTooltip.setAppearance(normalizeAppearance(changes.appearance.newValue));
    const keys = ["enabled", "targetCurrencies", "underline", "selectionMode", "domainOverrides"].filter((k) => k in changes);
    if (!keys.length) return;
    applyPrefs(Object.fromEntries(keys.map((k) => [k, changes[k].newValue])));
    if (keys.length === 1 && keys[0] === "underline") return renderStyle();
    if (keys.some((k) => k !== "selectionMode")) restart();
  }

  (async () => {
    if (!isContextValid()) return;
    try {
      const prefs = await chrome.storage.sync.get([
        "enabled", "selectionMode", "underline", "targetCurrencies", "targetCurrency", "domainOverrides", "appearance"
      ]);
      applyPrefs(prefs);
      window.ForexTooltip.setAppearance(normalizeAppearance(prefs.appearance));
    } catch (err) {
      if (err.message?.includes("Extension context invalidated")) return handleContextLost();
      throw err;
    }
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    document.addEventListener("mousedown", onMouseDown, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });
    addEventListener("scroll", () => current && window.ForexTooltip.reposition(), { passive: true, capture: true });
    chrome.storage.onChanged.addListener(onStorageChanged);
    if (state.enabled) start();
  })();
})();
