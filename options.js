/**
 * options.js — Forex Hover Pro (Final)
 * Settings page logic:
 *  - Multi-currency selection with live chip UI
 *  - Per-domain currency overrides
 *  - Behavior toggles
 *  (API key is configured directly in background.js — see Setup Guide)
 */

// ── Currency Master List ────────────────────────────────────────────────────
const ALL_CURRENCIES = [
  { code:"USD", name:"US Dollar",          flag:"🇺🇸" },
  { code:"EUR", name:"Euro",               flag:"🇪🇺" },
  { code:"GBP", name:"British Pound",      flag:"🇬🇧" },
  { code:"JPY", name:"Japanese Yen",       flag:"🇯🇵" },
  { code:"INR", name:"Indian Rupee",       flag:"🇮🇳" },
  { code:"KRW", name:"Korean Won",         flag:"🇰🇷" },
  { code:"AUD", name:"Australian Dollar",  flag:"🇦🇺" },
  { code:"CAD", name:"Canadian Dollar",    flag:"🇨🇦" },
  { code:"CHF", name:"Swiss Franc",        flag:"🇨🇭" },
  { code:"CNY", name:"Chinese Yuan",       flag:"🇨🇳" },
  { code:"MXN", name:"Mexican Peso",       flag:"🇲🇽" },
  { code:"BRL", name:"Brazilian Real",     flag:"🇧🇷" },
  { code:"SGD", name:"Singapore Dollar",   flag:"🇸🇬" },
  { code:"HKD", name:"Hong Kong Dollar",   flag:"🇭🇰" },
  { code:"NOK", name:"Norwegian Krone",    flag:"🇳🇴" },
  { code:"SEK", name:"Swedish Krona",      flag:"🇸🇪" },
  { code:"DKK", name:"Danish Krone",       flag:"🇩🇰" },
  { code:"NZD", name:"New Zealand Dollar", flag:"🇳🇿" },
  { code:"ZAR", name:"South African Rand", flag:"🇿🇦" },
  { code:"AED", name:"UAE Dirham",         flag:"🇦🇪" },
  { code:"PLN", name:"Polish Złoty",       flag:"🇵🇱" },
  { code:"CZK", name:"Czech Koruna",       flag:"🇨🇿" },
  { code:"HUF", name:"Hungarian Forint",   flag:"🇭🇺" },
  { code:"RON", name:"Romanian Leu",       flag:"🇷🇴" },
  { code:"TRY", name:"Turkish Lira",       flag:"🇹🇷" },
  { code:"THB", name:"Thai Baht",          flag:"🇹🇭" },
  { code:"MYR", name:"Malaysian Ringgit",  flag:"🇲🇾" },
  { code:"IDR", name:"Indonesian Rupiah",  flag:"🇮🇩" },
  { code:"PHP", name:"Philippine Peso",    flag:"🇵🇭" },
  { code:"VND", name:"Vietnamese Dong",    flag:"🇻🇳" },
  { code:"SAR", name:"Saudi Riyal",        flag:"🇸🇦" },
  { code:"QAR", name:"Qatari Riyal",       flag:"🇶🇦" },
  { code:"KWD", name:"Kuwaiti Dinar",      flag:"🇰🇼" },
  { code:"BHD", name:"Bahraini Dinar",     flag:"🇧🇭" },
  { code:"ILS", name:"Israeli Shekel",     flag:"🇮🇱" },
  { code:"EGP", name:"Egyptian Pound",     flag:"🇪🇬" },
  { code:"NGN", name:"Nigerian Naira",     flag:"🇳🇬" },
  { code:"GHS", name:"Ghanaian Cedi",      flag:"🇬🇭" },
  { code:"KES", name:"Kenyan Shilling",    flag:"🇰🇪" },
  { code:"CLP", name:"Chilean Peso",       flag:"🇨🇱" },
  { code:"COP", name:"Colombian Peso",     flag:"🇨🇴" },
  { code:"PEN", name:"Peruvian Sol",       flag:"🇵🇪" },
  { code:"ARS", name:"Argentine Peso",     flag:"🇦🇷" },
  { code:"UYU", name:"Uruguayan Peso",     flag:"🇺🇾" },
  { code:"PKR", name:"Pakistani Rupee",    flag:"🇵🇰" },
  { code:"BDT", name:"Bangladeshi Taka",   flag:"🇧🇩" },
  { code:"LKR", name:"Sri Lankan Rupee",   flag:"🇱🇰" },
  { code:"NPR", name:"Nepalese Rupee",     flag:"🇳🇵" },
  { code:"UAH", name:"Ukrainian Hryvnia",  flag:"🇺🇦" },
  { code:"RUB", name:"Russian Ruble",      flag:"🇷🇺" },
];

// ── State ────────────────────────────────────────────────────────────────────
let selectedCurrencies = new Set(["USD","EUR","GBP"]);
let domainOverrides = {}; // { "amazon.co.uk": "GBP", ... }
let prefs = { enabled: true, selectionMode: true, underline: true };
let dirty = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const grid = document.getElementById("currency-grid");
const strip = document.getElementById("selected-strip");
const filterInput = document.getElementById("currency-filter");
const selCountEl = document.getElementById("sel-count");
const selBadge = document.getElementById("sel-count-badge");
const saveBar = document.getElementById("save-bar");
const saveBtn = document.getElementById("save-btn");
const saveFeedback = document.getElementById("save-feedback");

// ── Navigation ───────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`page-${page}`)?.classList.add("active");
  });
});

// ── Load settings ─────────────────────────────────────────────────────────────
async function load() {
  const data = await chrome.storage.sync.get([
    "targetCurrencies","targetCurrency","domainOverrides",
    "enabled","selectionMode","underline"
  ]);

  if (data.targetCurrencies?.length) {
    selectedCurrencies = new Set(data.targetCurrencies);
  } else if (data.targetCurrency) {
    selectedCurrencies = new Set([data.targetCurrency]);
  }

  domainOverrides = data.domainOverrides || {};
  prefs.enabled = data.enabled !== false;
  prefs.selectionMode = data.selectionMode !== false;
  prefs.underline = data.underline !== false;

  document.getElementById("pref-enabled").checked = prefs.enabled;
  document.getElementById("pref-selection").checked = prefs.selectionMode;
  document.getElementById("pref-underline").checked = prefs.underline;

  renderGrid();
  renderStrip();
  renderOverrides();
  populateCurrencySelect();
}

// ── Currency grid ─────────────────────────────────────────────────────────────
function renderGrid(filter = "") {
  const q = filter.toLowerCase();
  const visible = ALL_CURRENCIES.filter(c =>
    !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  );

  grid.innerHTML = visible.map(c => `
    <div class="currency-chip ${selectedCurrencies.has(c.code) ? "selected" : ""}"
         data-code="${c.code}">
      <span class="cc-flag">${c.flag}</span>
      <div class="cc-info">
        <div class="cc-code">${c.code}</div>
        <div class="cc-name">${c.name}</div>
      </div>
      <div class="cc-check">✓</div>
    </div>
  `).join("");

  grid.querySelectorAll(".currency-chip").forEach(chip => {
    chip.addEventListener("click", () => toggleCurrency(chip.dataset.code));
  });

  updateCount();
}

function toggleCurrency(code) {
  if (selectedCurrencies.has(code)) {
    if (selectedCurrencies.size <= 1) return; // Keep at least one
    selectedCurrencies.delete(code);
  } else {
    selectedCurrencies.add(code);
  }
  markDirty();
  renderGrid(filterInput.value);
  renderStrip();
}

function renderStrip() {
  if (selectedCurrencies.size === 0) {
    strip.innerHTML = `<span class="strip-empty">No currencies selected yet</span>`;
    return;
  }
  strip.innerHTML = [...selectedCurrencies].map(code => {
    const c = ALL_CURRENCIES.find(x => x.code === code) || { flag: "🌐", name: code };
    return `<div class="strip-chip" data-code="${code}">
      <span>${c.flag}</span> ${code}
      <span class="strip-x">×</span>
    </div>`;
  }).join("");

  strip.querySelectorAll(".strip-chip").forEach(chip => {
    chip.addEventListener("click", () => toggleCurrency(chip.dataset.code));
  });
}

function updateCount() {
  const n = selectedCurrencies.size;
  selCountEl.textContent = `${n} currenc${n === 1 ? "y" : "ies"} selected`;
  selBadge.textContent = n;
}

filterInput.addEventListener("input", () => renderGrid(filterInput.value));

document.getElementById("clear-all-btn").addEventListener("click", () => {
  // Keep only the first selected
  const first = [...selectedCurrencies][0];
  selectedCurrencies = new Set([first]);
  markDirty();
  renderGrid(filterInput.value);
  renderStrip();
});

// ── Domain overrides ─────────────────────────────────────────────────────────
function populateCurrencySelect() {
  const sel = document.getElementById("new-currency-select");
  sel.innerHTML = ALL_CURRENCIES.map(c =>
    `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`
  ).join("");
}

function renderOverrides() {
  const tbody = document.getElementById("override-tbody");
  const entries = Object.entries(domainOverrides);
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--text-dim);font-size:12px;padding:12px 10px">No overrides configured.</td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(([domain, currency]) => {
    const c = ALL_CURRENCIES.find(x => x.code === currency);
    return `<tr>
      <td class="dt-domain">${domain}</td>
      <td><span class="dt-flag">${c?.flag || "🌐"}</span> <span class="dt-currency">${currency}</span></td>
      <td><button class="dt-remove" data-domain="${domain}">✕</button></td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll(".dt-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      delete domainOverrides[btn.dataset.domain];
      markDirty();
      renderOverrides();
    });
  });
}

document.getElementById("add-override-btn").addEventListener("click", () => {
  const domain = document.getElementById("new-domain").value.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const currency = document.getElementById("new-currency-select").value;
  if (!domain) return;
  domainOverrides[domain] = currency;
  document.getElementById("new-domain").value = "";
  markDirty();
  renderOverrides();
});

// ── Behavior toggles ─────────────────────────────────────────────────────────
["pref-enabled","pref-selection","pref-underline"].forEach(id => {
  document.getElementById(id).addEventListener("change", markDirty);
});

// ── Dirty / Save ─────────────────────────────────────────────────────────────
function markDirty() {
  dirty = true;
  saveBar.classList.add("visible");
  saveFeedback.classList.remove("show");
}

saveBtn.addEventListener("click", async () => {
  const currencies = [...selectedCurrencies];

  const settings = {
    targetCurrencies: currencies,
    targetCurrency: currencies[0], // legacy compat
    domainOverrides,
    enabled: document.getElementById("pref-enabled").checked,
    selectionMode: document.getElementById("pref-selection").checked,
    underline: document.getElementById("pref-underline").checked,
  };

  await chrome.storage.sync.set(settings);

  // Notify all content scripts about the change
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: "SET_TARGET_CURRENCIES",
      value: currencies,
    }).catch(() => {}); // Ignore tabs without content script
  });
  chrome.tabs.query({}).then(tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: "SET_ENABLED",
        value: settings.enabled,
      }).catch(() => {});
    });
  });

  dirty = false;
  saveFeedback.classList.add("show");
  saveBtn.style.display = "none";
  setTimeout(() => {
    saveBar.classList.remove("visible");
    saveBtn.style.display = "";
    saveFeedback.classList.remove("show");
  }, 2500);
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
load();
