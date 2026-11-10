/**
 * popup.js — converter with flags, a searchable currency picker, your
 * currencies at a glance, and persistent recent conversions.
 */
import "./src/ui/backdrop.css";
import { CURRENCIES, CURRENCY_BY_CODE, isCurrencyCode } from "./src/shared/currencies.ts";
import { formatAmount, formatMoney } from "./src/shared/format.ts";
import { normalizeAppearance } from "./src/ui/appearance.ts";
import { ageLabel, h } from "./src/ui/dom.ts";
import { flag, FLAG_CSS } from "./src/ui/flag.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";

const MAX_HISTORY = 6;
const $ = (id) => document.getElementById(id);
const el = {
  toggle: $("toggle-enabled"), status: $("status"), amount: $("amount"), from: $("from"), to: $("to"),
  swap: $("swap"), result: $("result"), rate: $("rate"), also: $("also"), error: $("error"),
  copy: $("copy"), history: $("history"), clearHistory: $("clear-history"),
  picker: $("picker"), pickerSearch: $("picker-search"), pickerList: $("picker-list")
};
const CHEVRON = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 4 2.5 2.5L7.5 4"/></svg>';

document.head.append(h("style", {}, GLASS_CSS + FLAG_CSS));
let appearance = normalizeAppearance(null);
let glasses = [];
let targets = ["USD", "EUR", "GBP"];
let history = [];
const pair = { from: "USD", to: "EUR" };
let last = null;
let requestId = 0;
let debounce = 0;
let historyTimer = 0;

function setAppearance(raw) {
  appearance = normalizeAppearance(raw);
  applyAppearance(document.documentElement, appearance);
  glasses.forEach((g) => g.update(appearance));
}

function parseAmount(text) {
  const n = Number(String(text).replace(/[\s,_']/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1e15 ? n : null;
}

function renderCurrencyButton(button, code) {
  button.replaceChildren(flag(code), code);
  button.insertAdjacentHTML("beforeend", CHEVRON); // static icon markup, no data
  button.setAttribute("aria-label", `${button.id === "from" ? "From" : "To"}: ${CURRENCY_BY_CODE[code].name}`);
}

function setPair(from, to) {
  pair.from = from;
  pair.to = to;
  renderCurrencyButton(el.from, from);
  renderCurrencyButton(el.to, to);
  chrome.storage.local.set({ popupState: { ...pair, amount: el.amount.value.slice(0, 20) } });
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
  const { from, to } = pair;
  el.error.hidden = true;
  if (!amount) {
    last = null;
    el.result.textContent = "—";
    el.rate.textContent = "Enter an amount";
    renderAlso(null, {});
    return;
  }
  const id = ++requestId;
  try {
    const res = await getRates(from, [to, ...targets]);
    if (id !== requestId) return; // superseded by newer input
    const rateOf = (code) => (code === from ? 1 : res.rates[code]?.rate);
    const rate = rateOf(to);
    if (!rate) throw new Error("UNSUPPORTED_CURRENCY");
    last = { amount, from, to, value: amount * rate };
    el.result.textContent = formatMoney(last.value, to);
    el.rate.textContent = `1 ${from} = ${rate.toPrecision(5)} ${to} · ${res.stale ? "offline, " : ""}${ageLabel(res.timestamp)}`;
    renderSource(res.source);
    renderAlso(amount, Object.fromEntries(targets.map((c) => [c, rateOf(c)])));
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => addHistory(last), 1200);
  } catch (err) {
    if (id !== requestId) return;
    last = null;
    el.result.textContent = "—";
    el.rate.textContent = " ";
    el.error.hidden = false;
    el.error.textContent = err.message === "UNSUPPORTED_CURRENCY" ? "This pair isn't available right now." : "Couldn't reach the rate service. Check your connection.";
  }
}

// Name whichever service actually supplied the numbers (ExchangeRate-API requires attribution).
function renderSource(source) {
  $("source").replaceChildren(source === "open-er-api"
    ? h("a", { href: "https://www.exchangerate-api.com", target: "_blank", rel: "noopener" }, "Rates by ExchangeRate-API")
    : "Daily reference rates · no account needed");
}

function renderAlso(amount, rates) {
  const codes = targets.filter((c) => c !== pair.from && c !== pair.to);
  if (!codes.length) return el.also.replaceChildren(h("div", { class: "empty" }, "Add more currencies in Settings."));
  el.also.replaceChildren(...codes.map((code) =>
    h("button", { class: "row", title: `Convert to ${code}`, onclick: () => { setPair(pair.from, code); convert(); } },
      flag(code),
      h("span", { class: "text" }, h("b", {}, code), h("small", {}, CURRENCY_BY_CODE[code].name)),
      h("span", { class: "num" }, amount && rates[code] ? formatMoney(amount * rates[code], code) : "—")
    )
  ));
}

// ─── Picker ───────────────────────────────────────────────────────────────
let picking = null;
function openPicker(which) {
  picking = which;
  el.pickerSearch.value = "";
  renderPicker();
  el.picker.hidden = false;
  el.pickerSearch.focus();
}
function closePicker() {
  el.picker.hidden = true;
  (picking === "from" ? el.from : el.to).focus();
  picking = null;
}
function choose(code) {
  const other = picking === "from" ? pair.to : pair.from;
  // Picking the other side's currency swaps them.
  const next = picking === "from" ? [code, code === other ? pair.from : other] : [code === other ? pair.to : other, code];
  setPair(...next);
  closePicker();
  convert();
}
function renderPicker() {
  const q = el.pickerSearch.value.trim().toLowerCase();
  const selected = pair[picking];
  const list = CURRENCIES.filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  // Your currencies first, then the rest.
  list.sort((a, b) => (targets.includes(b.code) ? 1 : 0) - (targets.includes(a.code) ? 1 : 0));
  el.pickerList.replaceChildren(...(list.length ? list.map((c) =>
    h("button", { class: "pick", role: "option", "aria-selected": String(c.code === selected), onclick: () => choose(c.code) },
      flag(c.code), h("b", {}, c.code), h("span", {}, c.name))
  ) : [h("div", { class: "empty" }, "No matches")]));
}
el.from.addEventListener("click", () => openPicker("from"));
el.to.addEventListener("click", () => openPicker("to"));
el.pickerSearch.addEventListener("input", renderPicker);
el.pickerSearch.addEventListener("keydown", (e) => {
  if (e.key === "Enter") el.pickerList.querySelector(".pick")?.click();
  if (e.key === "ArrowDown") { e.preventDefault(); el.pickerList.querySelector(".pick")?.focus(); }
});
el.pickerList.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const sib = e.key === "ArrowDown" ? document.activeElement?.nextElementSibling : document.activeElement?.previousElementSibling;
  (sib ?? el.pickerSearch).focus();
});
$("picker-close").addEventListener("click", closePicker);
el.picker.addEventListener("click", (e) => { if (e.target === el.picker) closePicker(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.picker.hidden) { e.preventDefault(); closePicker(); } });

// ─── History ──────────────────────────────────────────────────────────────
function addHistory(entry) {
  if (!entry) return;
  const same = (x) => x.amount === entry.amount && x.from === entry.from && x.to === entry.to;
  history = [{ ...entry, at: Date.now() }, ...history.filter((x) => !same(x))].slice(0, MAX_HISTORY);
  chrome.storage.local.set({ history });
  renderHistory();
}

function renderHistory() {
  el.clearHistory.hidden = !history.length;
  if (!history.length) return el.history.replaceChildren(h("div", { class: "empty" }, "Your conversions will appear here."));
  el.history.replaceChildren(...history.map((item) =>
    h("button", {
      class: "row hist-row",
      title: ageLabel(item.at),
      onclick: () => {
        el.amount.value = formatAmount(item.amount, item.from).replace(/,/g, "");
        setPair(item.from, item.to);
        convert();
      }
    },
      flag(item.from),
      h("span", { class: "text" }, formatMoney(item.amount, item.from)),
      h("span", { class: "num" }, formatMoney(item.value, item.to)),
      flag(item.to)
    )
  ));
}

function validHistory(list) {
  return Array.isArray(list)
    ? list.filter((x) => x && isCurrencyCode(x.from) && isCurrencyCode(x.to) && Number.isFinite(x.amount) && Number.isFinite(x.value)).slice(0, MAX_HISTORY)
    : [];
}

// ─── Events ───────────────────────────────────────────────────────────────
el.amount.addEventListener("input", () => {
  setPair(pair.from, pair.to);
  clearTimeout(debounce);
  debounce = setTimeout(convert, 150);
});
el.amount.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { clearTimeout(historyTimer); convert().then(() => addHistory(last)); }
});
el.swap.addEventListener("click", () => { setPair(pair.to, pair.from); convert(); });
el.copy.addEventListener("click", async () => {
  if (!last) return;
  await navigator.clipboard.writeText(formatMoney(last.value, last.to));
  el.copy.textContent = "Copied";
  setTimeout(() => (el.copy.textContent = "Copy"), 1200);
});
el.clearHistory.addEventListener("click", () => {
  history = [];
  chrome.storage.local.set({ history });
  renderHistory();
});
el.toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: el.toggle.checked });
  el.status.textContent = el.toggle.checked ? "On for web pages" : "Off for web pages";
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

  el.toggle.checked = sync.enabled !== false;
  el.status.textContent = el.toggle.checked ? "On for web pages" : "Off for web pages";
  const saved = Array.isArray(sync.targetCurrencies) ? sync.targetCurrencies.filter(isCurrencyCode) : [];
  if (saved.length) targets = saved;
  else if (isCurrencyCode(sync.targetCurrency)) targets = [sync.targetCurrency];

  const state = local.popupState ?? {};
  const from = isCurrencyCode(state.from) ? state.from : "USD";
  const to = isCurrencyCode(state.to) && state.to !== from ? state.to : targets.find((c) => c !== from) ?? "EUR";
  if (typeof state.amount === "string" && state.amount) el.amount.value = state.amount;
  setPair(from, to);
  history = validHistory(local.history);
  renderHistory();
  convert();
  el.amount.focus();
  el.amount.select();
})();
