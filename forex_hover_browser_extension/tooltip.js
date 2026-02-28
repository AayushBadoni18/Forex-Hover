/**
 * tooltip.js — Forex Hover Pro v2
 *
 * Shadow DOM tooltip supporting:
 *  - Multi-currency mode (grid of all selected target currencies)
 *  - Position-by-coordinates mode (for text selection, no anchor element)
 */

window.ForexTooltip = (() => {

  let hostElement = null;
  let shadowRoot = null;
  let tooltipEl = null;
  let currentAnchor = null;
  let hideTimeout = null;

  const TOOLTIP_CSS = `
    :host {
      all: initial;
      position: fixed;
      top: 0; left: 0;
      z-index: 2147483647;
      pointer-events: none;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .fhp-tooltip {
      position: absolute;
      padding: 12px 15px;
      border-radius: 14px;
      min-width: 230px;
      max-width: 370px;
      background: rgba(8, 12, 24, 0.88);
      backdrop-filter: blur(18px) saturate(200%);
      -webkit-backdrop-filter: blur(18px) saturate(200%);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 14px 44px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07);
      color: #f0f4ff;
      font-size: 13px;
      line-height: 1.4;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px) scale(0.96);
      transition: opacity 0.2s ease, transform 0.2s ease;
      will-change: opacity, transform;
    }
    .fhp-tooltip.fhp-visible { opacity: 1; transform: translateY(0) scale(1); }

    .fhp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 9px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .fhp-original-amount {
      font-size: 16px;
      font-weight: 700;
      color: #c8d8ff;
      letter-spacing: -0.2px;
    }
    .fhp-original-badge {
      display: inline-block;
      background: rgba(180,200,255,0.1);
      color: rgba(180,200,255,0.8);
      border: 1px solid rgba(180,200,255,0.2);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.6px;
    }
    .fhp-arrow { margin-left: auto; color: rgba(125,255,184,0.4); font-size: 13px; }

    .fhp-rates-grid { display: flex; flex-direction: column; gap: 4px; }
    .fhp-rate-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 7px;
      border-radius: 8px;
    }
    .fhp-rate-row:nth-child(odd) { background: rgba(255,255,255,0.03); }
    .fhp-rate-flag { font-size: 15px; line-height: 1; flex-shrink: 0; }
    .fhp-rate-code {
      font-size: 11px;
      font-weight: 600;
      color: rgba(180,200,255,0.65);
      min-width: 32px;
      letter-spacing: 0.3px;
    }
    .fhp-rate-value { font-size: 14px; font-weight: 700; color: #7dffb8; letter-spacing: -0.2px; flex: 1; }
    .fhp-rate-exchange { font-size: 10px; color: rgba(150,165,200,0.4); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .fhp-rate-error { font-size: 11px; color: rgba(255,120,120,0.7); flex: 1; }

    .fhp-footer {
      margin-top: 9px;
      padding-top: 7px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fhp-source-tag { font-size: 9px; color: rgba(130,150,200,0.38); letter-spacing: 0.3px; }
    .fhp-age { font-size: 9px; color: rgba(125,255,184,0.35); }

    .fhp-selection-label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: rgba(255,210,100,0.7);
      background: rgba(255,210,100,0.07);
      border: 1px solid rgba(255,210,100,0.15);
      border-radius: 4px;
      padding: 2px 7px;
      margin-bottom: 9px;
    }

    .fhp-loading {
      display: flex; align-items: center; gap: 10px;
      color: rgba(200,215,255,0.65); font-size: 12px; padding: 4px 0;
    }
    .fhp-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(125,255,184,0.2);
      border-top-color: #7dffb8;
      border-radius: 50%;
      animation: fhp-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes fhp-spin { to { transform: rotate(360deg); } }
    .fhp-error { color: #ff8080; font-size: 12px; padding: 4px 0; }
  `;

  const FLAGS = {
    USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",JPY:"🇯🇵",INR:"🇮🇳",KRW:"🇰🇷",
    AUD:"🇦🇺",CAD:"🇨🇦",CHF:"🇨🇭",CNY:"🇨🇳",MXN:"🇲🇽",BRL:"🇧🇷",
    SGD:"🇸🇬",HKD:"🇭🇰",NOK:"🇳🇴",SEK:"🇸🇪",DKK:"🇩🇰",NZD:"🇳🇿",
    ZAR:"🇿🇦",AED:"🇦🇪",
  };

  function init() {
    if (hostElement) return;
    hostElement = document.createElement("div");
    hostElement.setAttribute("data-fhp-host", "true");
    document.body.appendChild(hostElement);
    shadowRoot = hostElement.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = TOOLTIP_CSS;
    shadowRoot.appendChild(style);
    tooltipEl = document.createElement("div");
    tooltipEl.className = "fhp-tooltip";
    shadowRoot.appendChild(tooltipEl);
  }

  function showLoading(anchorOrCoords) {
    init();
    clearTimeout(hideTimeout);
    currentAnchor = anchorOrCoords;
    tooltipEl.innerHTML = `<div class="fhp-loading"><div class="fhp-spinner"></div><span>Fetching rates…</span></div>`;
    positionTooltip(anchorOrCoords);
    tooltipEl.classList.add("fhp-visible");
  }

  /**
   * Shows multi-currency conversion results.
   * @param {object} opts
   * @param {number}  opts.amount
   * @param {string}  opts.originalCurrency
   * @param {object}  opts.rates  - { [code]: { success, rate, timestamp } | { success: false, error } }
   * @param {boolean} [opts.isSelection]
   */
  function showMultiResult({ amount, originalCurrency, rates, isSelection }) {
    if (!tooltipEl) return;

    const sym = window.PriceDetector.getSymbol(originalCurrency);
    const origFormatted = sym + window.PriceDetector.formatAmount(amount, originalCurrency);

    const timestamps = Object.values(rates).filter(r => r.success).map(r => r.timestamp);
    const latestTs = timestamps.length ? Math.max(...timestamps) : null;
    const ageMin = latestTs ? Math.round((Date.now() - latestTs) / 60000) : null;
    const ageStr = ageMin === null ? "" : ageMin === 0 ? "just now" : `${ageMin}m ago`;

    const rowsHtml = Object.entries(rates).map(([code, entry]) => {
      const flag = FLAGS[code] || "🌐";
      if (!entry.success) {
        return `<div class="fhp-rate-row">
          <span class="fhp-rate-flag">${flag}</span>
          <span class="fhp-rate-code">${code}</span>
          <span class="fhp-rate-error">unavailable</span>
        </div>`;
      }
      const converted = amount * entry.rate;
      const convSym = window.PriceDetector.getSymbol(code);
      const convFormatted = convSym + window.PriceDetector.formatAmount(converted, code);
      return `<div class="fhp-rate-row">
        <span class="fhp-rate-flag">${flag}</span>
        <span class="fhp-rate-code">${code}</span>
        <span class="fhp-rate-value">${convFormatted}</span>
        <span class="fhp-rate-exchange">1 ${originalCurrency} = ${entry.rate.toFixed(4)}</span>
      </div>`;
    }).join("");

    tooltipEl.innerHTML = `
      ${isSelection ? `<div class="fhp-selection-label">✂ Selected text</div>` : ""}
      <div class="fhp-header">
        <span class="fhp-original-amount">${origFormatted}</span>
        <span class="fhp-original-badge">${originalCurrency}</span>
        <span class="fhp-arrow">→</span>
      </div>
      <div class="fhp-rates-grid">${rowsHtml}</div>
      <div class="fhp-footer">
        <span class="fhp-source-tag">ExchangeRate-API</span>
        ${ageStr ? `<span class="fhp-age">Updated ${ageStr}</span>` : ""}
      </div>
    `;

    positionTooltip(currentAnchor);
  }

  function showError(message) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = `<div class="fhp-error">⚠ ${message}</div>`;
    positionTooltip(currentAnchor);
  }

  function hide() {
    currentAnchor = null;
    if (!tooltipEl) return;
    tooltipEl.classList.remove("fhp-visible");
    hideTimeout = setTimeout(() => { if (tooltipEl) tooltipEl.innerHTML = ""; }, 220);
  }

  /**
   * Positions tooltip near an element or {x, y} coordinate.
   * anchorOrCoords: HTMLElement | {x: number, y: number}
   */
  function positionTooltip(anchorOrCoords) {
    if (!tooltipEl || !hostElement || !anchorOrCoords) return;

    let refBottom, refTop, refLeft;

    if (anchorOrCoords.nodeType === Node.ELEMENT_NODE) {
      const rect = anchorOrCoords.getBoundingClientRect();
      refBottom = rect.bottom; refTop = rect.top; refLeft = rect.left;
    } else {
      refBottom = anchorOrCoords.y + 6;
      refTop = anchorOrCoords.y - 6;
      refLeft = anchorOrCoords.x;
    }

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const ttW = tooltipEl.offsetWidth || 260;
    const ttH = tooltipEl.offsetHeight || 130;
    const GAP = 10;

    let top = refBottom + GAP;
    let left = refLeft;

    if (top + ttH > vpH - 8) top = refTop - ttH - GAP;
    if (left + ttW > vpW - 8) left = vpW - ttW - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  }

  function reposition() {
    if (currentAnchor) positionTooltip(currentAnchor);
  }

  function destroy() {
    if (hostElement) {
      hostElement.remove();
      hostElement = null; shadowRoot = null; tooltipEl = null; currentAnchor = null;
    }
  }

  return { showLoading, showMultiResult, showError, hide, destroy, reposition };

})();
