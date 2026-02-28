/**
 * popup.js — Forex Hover Pro (Final)
 *
 * Handles:
 *  - Extension toggle (enable/disable)
 *  - Active hover-target currency chips display
 *  - Manual converter: amount + from/to dropdowns → result panel
 *  - Swap currencies button
 *  - "Convert again" chaining: pipes result into next conversion
 *  - Session history of last 5 conversions
 */

// ─── Currency master list ─────────────────────────────────────────────────────
const CURRENCIES = [
  { code:"USD", name:"US Dollar",           flag:"🇺🇸" },
  { code:"EUR", name:"Euro",                flag:"🇪🇺" },
  { code:"GBP", name:"British Pound",       flag:"🇬🇧" },
  { code:"JPY", name:"Japanese Yen",        flag:"🇯🇵" },
  { code:"INR", name:"Indian Rupee",        flag:"🇮🇳" },
  { code:"KRW", name:"Korean Won",          flag:"🇰🇷" },
  { code:"AUD", name:"Australian Dollar",   flag:"🇦🇺" },
  { code:"CAD", name:"Canadian Dollar",     flag:"🇨🇦" },
  { code:"CHF", name:"Swiss Franc",         flag:"🇨🇭" },
  { code:"CNY", name:"Chinese Yuan",        flag:"🇨🇳" },
  { code:"MXN", name:"Mexican Peso",        flag:"🇲🇽" },
  { code:"BRL", name:"Brazilian Real",      flag:"🇧🇷" },
  { code:"SGD", name:"Singapore Dollar",    flag:"🇸🇬" },
  { code:"HKD", name:"Hong Kong Dollar",    flag:"🇭🇰" },
  { code:"NOK", name:"Norwegian Krone",     flag:"🇳🇴" },
  { code:"SEK", name:"Swedish Krona",       flag:"🇸🇪" },
  { code:"NZD", name:"New Zealand Dollar",  flag:"🇳🇿" },
  { code:"ZAR", name:"South African Rand",  flag:"🇿🇦" },
  { code:"AED", name:"UAE Dirham",          flag:"🇦🇪" },
  { code:"DKK", name:"Danish Krone",        flag:"🇩🇰" },
  { code:"PLN", name:"Polish Złoty",        flag:"🇵🇱" },
  { code:"TRY", name:"Turkish Lira",        flag:"🇹🇷" },
  { code:"THB", name:"Thai Baht",           flag:"🇹🇭" },
  { code:"MYR", name:"Malaysian Ringgit",   flag:"🇲🇾" },
  { code:"IDR", name:"Indonesian Rupiah",   flag:"🇮🇩" },
  { code:"PHP", name:"Philippine Peso",     flag:"🇵🇭" },
  { code:"SAR", name:"Saudi Riyal",         flag:"🇸🇦" },
  { code:"QAR", name:"Qatari Riyal",        flag:"🇶🇦" },
  { code:"KWD", name:"Kuwaiti Dinar",       flag:"🇰🇼" },
  { code:"ILS", name:"Israeli Shekel",      flag:"🇮🇱" },
  { code:"EGP", name:"Egyptian Pound",      flag:"🇪🇬" },
  { code:"PKR", name:"Pakistani Rupee",     flag:"🇵🇰" },
  { code:"BDT", name:"Bangladeshi Taka",    flag:"🇧🇩" },
  { code:"CLP", name:"Chilean Peso",        flag:"🇨🇱" },
  { code:"COP", name:"Colombian Peso",      flag:"🇨🇴" },
  { code:"ARS", name:"Argentine Peso",      flag:"🇦🇷" },
];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const toggleEl     = document.getElementById("toggle-enabled");
const statusDot    = document.getElementById("status-dot");
const statusText   = document.getElementById("status-text");
const apiWarning   = document.getElementById("api-warning");
const currChips    = document.getElementById("curr-chips");
const openSettings = document.getElementById("open-settings");

const convAmount   = document.getElementById("conv-amount");
const convFrom     = document.getElementById("conv-from");
const convTo       = document.getElementById("conv-to");
const swapBtn      = document.getElementById("swap-btn");
const convBtn      = document.getElementById("conv-btn");

const resultPanel  = document.getElementById("result-panel");
const resFromFlag  = document.getElementById("res-from-flag");
const resFromAmt   = document.getElementById("res-from-amount");
const resAmount    = document.getElementById("res-amount");
const resCode      = document.getElementById("res-code");
const resRateEq    = document.getElementById("res-rate-eq");
const resRateAge   = document.getElementById("res-rate-age");
const resClear     = document.getElementById("res-clear");
const resChain     = document.getElementById("res-chain");
const historyList  = document.getElementById("history-list");

// ─── State ────────────────────────────────────────────────────────────────────
let targetCurrencies = ["USD", "EUR", "GBP"];
let conversionHistory = []; // session-only, max 5

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrency(code) {
  return CURRENCIES.find(c => c.code === code) || { code, flag: "🌐", name: code };
}

function formatAmount(n, code) {
  // Use locale formatting with sensible decimal places
  const decimals = ["JPY","KRW","IDR","CLP","COP","VND"].includes(code) ? 0 : 2;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function ageString(timestampMs) {
  const mins = Math.round((Date.now() - timestampMs) / 60000);
  if (mins === 0) return "live";
  if (mins === 1) return "1m ago";
  return `${mins}m ago`;
}

// ─── Populate dropdowns ────────────────────────────────────────────────────────
function populateSelects(fromCode = "USD", toCode = "INR") {
  const options = CURRENCIES.map(c =>
    `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`
  ).join("");

  convFrom.innerHTML = options;
  convTo.innerHTML   = options;

  convFrom.value = fromCode;
  convTo.value   = toCode;
}

// ─── Load preferences ─────────────────────────────────────────────────────────
async function loadPrefs() {
  const data = await chrome.storage.sync.get(["enabled", "targetCurrencies", "targetCurrency"]);
  const isEnabled = data.enabled !== false;
  toggleEl.checked = isEnabled;
  updateStatus(isEnabled);

  if (data.targetCurrencies?.length) {
    targetCurrencies = data.targetCurrencies;
  } else if (data.targetCurrency) {
    targetCurrencies = [data.targetCurrency];
  }

  renderChips();

  // Pre-select "to" as first target currency if available
  const defaultTo = targetCurrencies[0] || "EUR";
  populateSelects("USD", defaultTo !== "USD" ? defaultTo : "EUR");
}

function updateStatus(enabled) {
  statusDot.className = "status-dot" + (enabled ? "" : " off");
  statusText.textContent = enabled ? "Active on this page" : "Extension disabled";
}

function renderChips() {
  if (!targetCurrencies.length) {
    currChips.innerHTML = `<span style="font-size:11px;color:rgba(180,200,240,0.3);padding:0 0 4px">No targets set — open Settings</span>`;
    return;
  }
  currChips.innerHTML = targetCurrencies.map(code => {
    const c = getCurrency(code);
    return `<span class="curr-chip">${c.flag} ${code}</span>`;
  }).join("");
}

// ─── Extension toggle ─────────────────────────────────────────────────────────
toggleEl.addEventListener("change", async () => {
  const enabled = toggleEl.checked;
  await chrome.storage.sync.set({ enabled });
  updateStatus(enabled);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "SET_ENABLED", value: enabled });
  } catch {}
});

// ─── Settings link ─────────────────────────────────────────────────────────────
openSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());

// ─── Swap button ──────────────────────────────────────────────────────────────
swapBtn.addEventListener("click", () => {
  const tmp = convFrom.value;
  convFrom.value = convTo.value;
  convTo.value = tmp;
  // If there's a result showing, hide it since the pair changed
  hideResult();
});

// ─── Convert ──────────────────────────────────────────────────────────────────
convBtn.addEventListener("click", runConversion);

// Also allow Enter key in amount field
convAmount.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runConversion();
});

// Hide result when user changes pair or amount manually
convFrom.addEventListener("change", hideResult);
convTo.addEventListener("change", hideResult);
convAmount.addEventListener("input", hideResult);

async function runConversion() {
  const raw = parseFloat(convAmount.value);
  if (!raw || isNaN(raw) || raw <= 0) {
    convAmount.focus();
    convAmount.style.borderColor = "rgba(255,92,92,0.5)";
    setTimeout(() => convAmount.style.borderColor = "", 1000);
    return;
  }

  const from = convFrom.value;
  const to   = convTo.value;

  // Show loading state
  convBtn.textContent = "Fetching rate…";
  convBtn.classList.add("loading");
  convBtn.disabled = true;

  try {
    let rate, timestamp;

    if (from === to) {
      rate = 1;
      timestamp = Date.now();
    } else {
      const result = await chrome.runtime.sendMessage({
        type: "GET_RATE",
        base: from,
        target: to,
      });

      if (!result.success) {
        throw new Error(result.error || "Rate unavailable");
      }

      rate      = result.rate;
      timestamp = result.timestamp;
    }

    const converted = raw * rate;
    showResult({ raw, from, to, rate, converted, timestamp });
    addToHistory({ raw, from, to, rate, converted });

  } catch (err) {
    convBtn.textContent = err.message?.includes("API key")
      ? "Add API key first"
      : "Error — try again";
    convBtn.style.background = "rgba(255,92,92,0.15)";
    convBtn.style.color = "#ff8888";
    setTimeout(() => resetConvBtn(), 2500);
    return;
  }

  resetConvBtn();
}

function resetConvBtn() {
  convBtn.textContent = "Convert";
  convBtn.classList.remove("loading");
  convBtn.disabled = false;
  convBtn.style.background = "";
  convBtn.style.color = "";
}

// ─── Show result ──────────────────────────────────────────────────────────────
function showResult({ raw, from, to, rate, converted, timestamp }) {
  const fromC = getCurrency(from);
  const toC   = getCurrency(to);

  resFromFlag.textContent  = fromC.flag;
  resFromAmt.textContent   = `${formatAmount(raw, from)} ${from}`;
  resAmount.textContent    = formatAmount(converted, to);
  resCode.textContent      = to;
  resRateEq.textContent    = `1 ${from} = ${rate.toFixed(4)} ${to}`;
  resRateAge.textContent   = ageString(timestamp);

  // Store for "convert again"
  resultPanel.dataset.converted = converted;
  resultPanel.dataset.to        = to;

  resultPanel.classList.add("show");
}

function hideResult() {
  resultPanel.classList.remove("show");
}

// ─── Clear button ─────────────────────────────────────────────────────────────
resClear.addEventListener("click", () => {
  hideResult();
  convAmount.value = "";
  convAmount.focus();
});

// ─── "Convert again" — chain the result into the next conversion ──────────────
resChain.addEventListener("click", () => {
  const converted = parseFloat(resultPanel.dataset.converted);
  const prevTo    = resultPanel.dataset.to;

  // The result becomes the new input
  convAmount.value = converted.toFixed(
    ["JPY","KRW","IDR","CLP"].includes(prevTo) ? 0 : 2
  );

  // The previous target becomes the new "from"
  convFrom.value = prevTo;

  // Pick a new "to" — cycle to the next currency in the target list
  // that isn't the same as the new "from"
  const nextTarget = targetCurrencies.find(c => c !== prevTo);
  if (nextTarget) {
    convTo.value = nextTarget;
  } else {
    // Fallback: pick first currency that isn't "from"
    const fallback = CURRENCIES.find(c => c.code !== prevTo);
    if (fallback) convTo.value = fallback.code;
  }

  hideResult();

  // Scroll amount into view and focus
  convAmount.scrollIntoView({ behavior: "smooth", block: "nearest" });
  convAmount.focus();
  convAmount.select();
});

// ─── History ──────────────────────────────────────────────────────────────────
function addToHistory({ raw, from, to, rate, converted }) {
  const fromC = getCurrency(from);
  const toC   = getCurrency(to);

  conversionHistory.unshift({ raw, from, to, rate, converted, fromC, toC });
  if (conversionHistory.length > 5) conversionHistory.pop();

  renderHistory();
}

function renderHistory() {
  if (conversionHistory.length === 0) {
    historyList.classList.remove("show");
    return;
  }

  historyList.classList.add("show");
  historyList.innerHTML = conversionHistory.map((h, i) => `
    <div class="history-item" style="animation-delay:${i * 0.04}s">
      <span class="hist-from">${h.fromC.flag} ${formatAmount(h.raw, h.from)} ${h.from}</span>
      <span class="hist-arrow">→</span>
      <span class="hist-to">${h.toC.flag} ${formatAmount(h.converted, h.to)} ${h.to}</span>
      <span class="hist-rate">@ ${h.rate.toFixed(4)}</span>
    </div>
  `).join("");
}

// ─── API key check ─────────────────────────────────────────────────────────────
async function checkApiKey() {
  try {
    const result = await chrome.runtime.sendMessage({ type: "GET_RATE", base: "USD", target: "EUR" });
    if (!result.success && result.error?.includes("API key")) {
      apiWarning.classList.add("visible");
    }
  } catch {}
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
loadPrefs();
checkApiKey();
