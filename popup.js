/**
 * popup.js — Forex Hover Pro popup: live converter, all-target preview,
 * persistent recent conversions, Liquid Glass surfaces.
 */
import "./src/ui/backdrop.css";
import { CURRENCIES, CURRENCY_BY_CODE, isCurrencyCode } from "./src/shared/currencies.ts";
import { formatAmount, formatMoney } from "./src/shared/format.ts";
import { normalizeAppearance } from "./src/ui/appearance.ts";
import { ageLabel, countUp, h, prefersReducedMotion } from "./src/ui/dom.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";

const MAX_HISTORY = 8;
const $ = (id) => document.getElementById(id);
const el = {
  toggle: $("toggle-enabled"), status: $("status"), amount: $("amount"), from: $("from"), to: $("to"),
  swap: $("swap"), resAmount: $("res-amount"), resRate: $("res-rate"), also: $("also"), error: $("error"),
  copy: $("copy"), chain: $("chain"), history: $("history"), clearHistory: $("clear-history")
};

document.head.append(h("style", {}, GLASS_CSS));
let appearance = normalizeAppearance(null);
let glasses = [];
let targets = ["USD", "EUR", "GBP"];
let history = [];
let last = null; // { amount, from, to, value }
let requestId = 0;
let debounce = 0;
let historyTimer = 0;

function setAppearance(raw) {
  appearance = normalizeAppearance(raw);
  applyAppearance(document.documentElement, appearance);
  glasses.forEach((g) => g.update(appearance));
}

const instant = () => !appearance.motion || prefersReducedMotion();

function parseAmount(text) {
  const n = Number(String(text).replace(/[\s,_']/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1e15 ? n : null;
}

function fillSelect(select, value) {
  select.replaceChildren(...CURRENCIES.map((c) => h("option", { value: c.code }, `${c.flag}  ${c.code}`)));
  select.value = value;
}

function setStatus(enabled) {
  el.status.textContent = enabled ? "Active on pages" : "Paused";
  el.status.classList.toggle("off", !enabled);
}

async function getRates(base, wanted) {
  const list = [...new Set(wanted)].filter((c) => c !== base).slice(0, 10);
  if (!list.length) return { rates: {}, timestamp: Date.now() };
  const res = await chrome.runtime.sendMessage({ type: "GET_RATES_MULTI", base, targets: list });
  if (!res?.success) throw new Error(res?.error || "Rates unavailable");
  return res;
}

async function convert() {
  const amount = parseAmount(el.amount.value);
  const from = el.from.value;
  const to = el.to.value;
  el.error.hidden = true;
  if (!amount) {
    el.resAmount.textContent = "—";
    el.resRate.textContent = "Enter an amount";
    el.also.replaceChildren();
    return;
  }
  const id = ++requestId;
  try {
    const res = await getRates(from, [to, ...targets]);
    if (id !== requestId) return; // a newer conversion superseded this one
    const rateOf = (code) => (code === from ? 1 : res.rates[code]?.rate);
    const rate = rateOf(to);
    if (!rate) throw new Error("UNSUPPORTED_CURRENCY");
    const value = amount * rate;
    last = { amount, from, to, value };
    countUp(el.resAmount, value, (n) => formatMoney(n, to), instant());
    el.resRate.textContent = `1 ${from} = ${rate.toPrecision(5)} ${to} · ${res.stale ? "offline, " : ""}${ageLabel(res.timestamp)}`;

    const others = targets.filter((c) => c !== to && c !== from && rateOf(c));
    el.also.replaceChildren(...others.map((code, i) =>
      h("button", { class: "also-row", style: `--i:${i}`, title: `Convert to ${code}`, onclick: () => { el.to.value = code; persistPair(); convert(); } },
        h("span", {}, CURRENCY_BY_CODE[code].flag),
        h("small", {}, `${code} · ${CURRENCY_BY_CODE[code].name}`),
        h("b", {}, formatMoney(amount * rateOf(code), code))
      )
    ));

    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => addHistory(last), 1200);
  } catch (err) {
    if (id !== requestId) return;
    el.resAmount.textContent = "—";
    el.resRate.textContent = "";
    el.also.replaceChildren();
    el.error.hidden = false;
    el.error.textContent = err.message === "UNSUPPORTED_CURRENCY" ? "This pair isn't available right now." : "Couldn't reach the rate service. Check your connection.";
  }
}

function scheduleConvert() {
  clearTimeout(debounce);
  debounce = setTimeout(convert, 180);
}

function persistPair() {
  chrome.storage.local.set({ popupState: { from: el.from.value, to: el.to.value, amount: el.amount.value.slice(0, 20) } });
}

// ─── History ──────────────────────────────────────────────────────────────
function addHistory(entry) {
  if (!entry) return;
  const same = (h) => h.amount === entry.amount && h.from === entry.from && h.to === entry.to;
  history = [{ ...entry, at: Date.now() }, ...history.filter((h) => !same(h))].slice(0, MAX_HISTORY);
  chrome.storage.local.set({ history });
  renderHistory();
}

function renderHistory() {
  el.clearHistory.hidden = !history.length;
  if (!history.length) return el.history.replaceChildren(h("div", { class: "empty" }, "Conversions you make show up here."));
  el.history.replaceChildren(...history.map((item) =>
    h("button", {
      title: ageLabel(item.at),
      onclick: () => {
        el.amount.value = formatAmount(item.amount, item.from).replace(/,/g, "");
        el.from.value = item.from;
        el.to.value = item.to;
        persistPair();
        convert();
      }
    },
      h("span", {}, `${CURRENCY_BY_CODE[item.from]?.flag ?? ""} ${formatMoney(item.amount, item.from)}`),
      h("span", {}, `${formatMoney(item.value, item.to)} ${CURRENCY_BY_CODE[item.to]?.flag ?? ""}`)
    )
  ));
}

function validHistory(list) {
  return Array.isArray(list)
    ? list.filter((x) => x && isCurrencyCode(x.from) && isCurrencyCode(x.to) && Number.isFinite(x.amount) && Number.isFinite(x.value)).slice(0, MAX_HISTORY)
    : [];
}

// ─── Events ───────────────────────────────────────────────────────────────
el.amount.addEventListener("input", () => { persistPair(); scheduleConvert(); });
el.amount.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(historyTimer); convert().then(() => addHistory(last)); } });
el.from.addEventListener("change", () => { persistPair(); convert(); });
el.to.addEventListener("change", () => { persistPair(); convert(); });
el.swap.addEventListener("click", () => {
  [el.from.value, el.to.value] = [el.to.value, el.from.value];
  el.swap.classList.toggle("spin");
  persistPair();
  convert();
});
el.copy.addEventListener("click", async () => {
  if (!last) return;
  await navigator.clipboard.writeText(formatMoney(last.value, last.to));
  el.copy.textContent = "Copied ✓";
  setTimeout(() => (el.copy.textContent = "Copy"), 1200);
});
el.chain.addEventListener("click", () => {
  if (!last) return;
  el.amount.value = formatAmount(last.value, last.to).replace(/,/g, "");
  el.from.value = last.to;
  el.to.value = targets.find((c) => c !== last.to) ?? (last.to === "USD" ? "EUR" : "USD");
  persistPair();
  convert();
  el.amount.focus();
});
el.clearHistory.addEventListener("click", () => {
  history = [];
  chrome.storage.local.set({ history });
  renderHistory();
});
el.toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: el.toggle.checked });
  setStatus(el.toggle.checked);
});
$("open-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.appearance) setAppearance(changes.appearance.newValue);
});

// ─── Boot ─────────────────────────────────────────────────────────────────
(async () => {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(["enabled", "targetCurrencies", "targetCurrency", "appearance"]),
    chrome.storage.local.get(["popupState", "history"])
  ]);
  setAppearance(sync.appearance);
  glasses = [...document.querySelectorAll(".glass")].map((node) => mountGlass(node, appearance));

  const enabled = sync.enabled !== false;
  el.toggle.checked = enabled;
  setStatus(enabled);
  const saved = Array.isArray(sync.targetCurrencies) ? sync.targetCurrencies.filter(isCurrencyCode) : [];
  if (saved.length) targets = saved;
  else if (isCurrencyCode(sync.targetCurrency)) targets = [sync.targetCurrency];

  const state = local.popupState ?? {};
  const from = isCurrencyCode(state.from) ? state.from : "USD";
  const to = isCurrencyCode(state.to) ? state.to : targets.find((c) => c !== from) ?? "EUR";
  fillSelect(el.from, from);
  fillSelect(el.to, to);
  if (typeof state.amount === "string") el.amount.value = state.amount;
  history = validHistory(local.history);
  renderHistory();
  convert();
  el.amount.focus();
  el.amount.select();
})();
