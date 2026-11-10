/**
 * The converter UI, shared by the floating in-page panel and the fallback
 * window: flags, searchable picker, your currencies, persistent history.
 * Built with DOM calls only, so it can live inside any web page.
 */
import { CURRENCIES, CURRENCY_BY_CODE, isCurrencyCode, type CurrencyCode } from "../shared/currencies.ts";
import { formatAmount, formatMoney } from "../shared/format.ts";
import type { Appearance } from "./appearance.ts";
import { ageLabel, h } from "./dom.ts";
import { flag } from "./flag.ts";
import { mountGlass, type GlassController } from "./glass.ts";
import { chevron, close, gear, logo, swapIcon } from "./icons.ts";

const MAX_HISTORY = 6;

export const CONVERTER_CSS = `
.cv { display: flex; flex-direction: column; gap: 10px; font-size: 13px; line-height: 1.38; color: var(--fg); position: relative; }
.cv .bar { display: flex; align-items: center; gap: 10px; padding: 9px 10px 9px 12px; }
.cv .bar .grow { flex: 1; min-width: 0; padding: 2px 6px; }
.cv .bar h1 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -0.015em; }
.cv .bar p { margin: 0; font-size: 12px; color: var(--fg-2); }
.cv .conv { padding: 6px 12px 10px; }
.cv .line { display: flex; align-items: center; gap: 10px; min-height: 58px; padding: 0 4px; }
.cv .cur {
  display: inline-flex; align-items: center; gap: 8px; border: 0; background: var(--fill); border-radius: 999px;
  padding: 6px 10px 6px 8px; font-size: 15px; font-weight: 600; cursor: pointer; flex: none; transition: background-color 0.15s var(--ease);
}
.cv .cur:hover { background: var(--fill-2); }
.cv .cur:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cv .cur svg { opacity: 0.5; }
.cv .amount, .cv .result {
  flex: 1; min-width: 0; text-align: right; font-size: 30px; font-weight: 600; letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums; border: 0; outline: 0; background: none; padding: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cv .amount::placeholder { color: var(--fg-3); }
.cv .amount::selection { background: color-mix(in srgb, var(--accent) 30%, transparent); }
.cv .result { color: var(--accent-text); }
/* Above the rows around it, so the round swap button is never covered. */
.cv .divider { position: relative; z-index: 5; height: 0; border-top: 0.5px solid var(--hairline); margin: 0 4px; }
.cv .swap {
  position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); width: 30px; height: 30px; padding: 0;
  border-radius: 50%; border: 0; background: var(--fill-2); backdrop-filter: blur(8px);
  display: grid; place-items: center; cursor: pointer; z-index: 4; transition: transform 0.25s var(--ease);
}
.cv .swap:hover { transform: translate(-50%, -50%) rotate(180deg); }
.cv .swap:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cv .meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 4px 0; margin-top: 2px; border-top: 0.5px solid var(--hairline); font-size: 12px; color: var(--fg-2); }
.cv .err { color: #ff453a; font-size: 12px; padding: 6px 4px 0; }
.cv .list-head { display: flex; justify-content: space-between; align-items: center; padding: 11px 16px 3px; }
.cv .list-head h2 { margin: 0; font-size: 12px; font-weight: 600; color: var(--fg-2); text-transform: uppercase; letter-spacing: 0.03em; }
.cv .row .num { font-weight: 600; font-variant-numeric: tabular-nums; }
.cv .row .text b { font-weight: 600; }
.cv button.row { width: 100%; border: 0; background: none; text-align: left; cursor: pointer; border-radius: 12px; }
.cv button.row:hover { background: var(--fill); }
.cv button.row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.cv .hist-row .text { color: var(--fg-2); font-variant-numeric: tabular-nums; }
.cv .empty { padding: 10px 16px 14px; color: var(--fg-3); }
.cv .foot { padding: 4px 10px; font-size: 11.5px; color: var(--fg-3); text-align: center; align-self: center; }
.cv .foot a { color: inherit; }
.cv .made-by { margin-top: -6px; padding: 2px 10px 6px; font-size: 12px; font-weight: 600; color: var(--fg-2); text-align: center; align-self: center; letter-spacing: 0.01em; }
[data-liquid="on"] .cv .list-head, [data-liquid="on"] .cv .line, [data-liquid="on"] .cv .meta { margin: 6px 4px; }
[data-liquid="on"] .cv .divider { border-top-color: transparent; }

/* Currency picker sheet */
.cv .sheet { position: absolute; inset: 0; z-index: 10; background: rgba(0,0,0,0.2); display: flex; align-items: flex-end; padding: 10px; border-radius: 26px; }
.cv .sheet[hidden] { display: none; }
.cv .sheet-card { width: 100%; max-height: 80%; display: flex; flex-direction: column; padding: 12px 10px 6px; animation: fhp-rise 0.2s var(--ease); }
@keyframes fhp-rise { from { transform: translateY(14px); opacity: 0; } }
.cv .sheet-head { display: flex; gap: 10px; align-items: center; padding: 0 4px 8px; }
.cv .picker-list { overflow-y: auto; overflow-x: hidden; padding-bottom: 4px; }
.cv .pick { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: none; padding: 9px 8px; border-radius: 10px; cursor: pointer; text-align: left; }
.cv .pick:hover, .cv .pick:focus-visible { background: var(--fill); outline: 0; }
.cv .pick b { font-weight: 600; width: 40px; }
.cv .pick span { color: var(--fg-2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cv .pick[aria-selected="true"]::after { content: "✓"; color: var(--accent-text); font-weight: 600; }
`;

export interface ConverterOptions {
  appearance: Appearance;
  onOpenSettings(): void;
  /** Shown as a close button in the header (floating panel only). */
  onClose?(): void;
}

export interface Converter {
  root: HTMLElement;
  /** The header, usable as a drag handle. */
  handle: HTMLElement;
  setAppearance(a: Appearance): void;
  focus(): void;
  /** Glass "forms" again, e.g. when the panel reopens. */
  pulse(): void;
  destroy(): void;
}

function parseAmount(text: string) {
  const n = Number(String(text).replace(/[\s,_']/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1e15 ? n : null;
}

export function createConverter({ appearance, onOpenSettings, onClose }: ConverterOptions): Converter {
  // ─── Markup ──────────────────────────────────────────────────────────────
  const status = h("p", {}, "On for web pages");
  const toggle = h("input", { type: "checkbox", role: "switch", "aria-label": "Convert prices on web pages" });
  const settingsBtn = h("button", { class: "icon-btn spin", title: "Settings", "aria-label": "Settings" }, gear());
  const closeBtn = onClose ? h("button", { class: "icon-btn", title: "Close (Esc)", "aria-label": "Close converter" }, close()) : null;
  const header = h("header", { class: "glass panel bar" },
    logo(),
    h("div", { class: "grow txt" }, h("h1", {}, "Forex Hover"), status),
    h("label", { class: "switch", title: "Convert prices on web pages" }, toggle, h("span")),
    settingsBtn,
    closeBtn
  );

  const fromBtn = h("button", { class: "cur", "aria-haspopup": "listbox" });
  const toBtn = h("button", { class: "cur", "aria-haspopup": "listbox" });
  const amount = h("input", { class: "amount", inputmode: "decimal", autocomplete: "off", placeholder: "0", value: "100", "aria-label": "Amount" });
  const result = h("output", { class: "result", "aria-live": "polite" }, "—");
  const swap = h("button", { class: "swap", "aria-label": "Swap currencies" }, swapIcon());
  const rate = h("span", {}, " ");
  const copy = h("button", { class: "link" }, "Copy");
  const error = h("div", { class: "err", hidden: true });
  const conv = h("section", { class: "glass panel conv", "aria-label": "Converter" },
    h("div", { class: "line txt" }, fromBtn, amount),
    h("div", { class: "divider" }, swap),
    h("div", { class: "line txt" }, toBtn, result),
    h("div", { class: "meta txt" }, rate, copy),
    error
  );

  const also = h("div");
  const history = h("div");
  const clearHistory = h("button", { class: "link" }, "Clear");
  const source = h("footer", { class: "foot txt" }, "Daily reference rates");

  const pickerSearch = h("input", { class: "search", placeholder: "Search", autocomplete: "off", "aria-label": "Search currencies" });
  const pickerList = h("div", { class: "picker-list", role: "listbox" });
  const pickerDone = h("button", { class: "link" }, "Done");
  const sheetCard = h("div", { class: "sheet-card glass panel", role: "dialog", "aria-modal": "true", "aria-label": "Choose currency" },
    h("div", { class: "sheet-head" }, pickerSearch, pickerDone), pickerList);
  const picker = h("div", { class: "sheet", hidden: true }, sheetCard);

  const root = h("div", { class: "cv" },
    header,
    conv,
    h("section", { class: "glass panel group", "aria-label": "Your currencies" }, h("div", { class: "list-head txt" }, h("h2", {}, "Your currencies")), also),
    h("section", { class: "glass panel group", "aria-label": "Recent conversions" }, h("div", { class: "list-head txt" }, h("h2", {}, "Recent"), clearHistory), history),
    source,
    h("footer", { class: "made-by txt" }, "Developed by Aayush Badoni"),
    picker
  );

  // ─── State ───────────────────────────────────────────────────────────────
  let targets: CurrencyCode[] = ["USD", "EUR", "GBP"];
  let items: { amount: number; from: CurrencyCode; to: CurrencyCode; value: number; at: number }[] = [];
  const pair: { from: CurrencyCode; to: CurrencyCode } = { from: "USD", to: "EUR" };
  let last: { amount: number; from: CurrencyCode; to: CurrencyCode; value: number } | null = null;
  let requestId = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let historyTimer: ReturnType<typeof setTimeout> | undefined;
  let picking: "from" | "to" | null = null;

  function renderCurrencyButton(button: HTMLButtonElement, code: CurrencyCode, side: string) {
    button.replaceChildren(flag(code), code, chevron());
    button.setAttribute("aria-label", `${side}: ${CURRENCY_BY_CODE[code].name}`);
  }

  function setPair(from: CurrencyCode, to: CurrencyCode) {
    pair.from = from;
    pair.to = to;
    renderCurrencyButton(fromBtn, from, "From");
    renderCurrencyButton(toBtn, to, "To");
    chrome.storage.local.set({ popupState: { ...pair, amount: amount.value.slice(0, 20) } });
  }

  async function getRates(base: CurrencyCode, wanted: CurrencyCode[]) {
    const list = [...new Set(wanted)].filter((c) => c !== base).slice(0, 10);
    if (!list.length) return { rates: {}, timestamp: Date.now() } as any;
    const res = await chrome.runtime.sendMessage({ type: "GET_RATES_MULTI", base, targets: list });
    if (!res?.success) throw new Error(res?.error || "Rates unavailable");
    return res;
  }

  async function convert() {
    const value = parseAmount(amount.value);
    const { from, to } = pair;
    error.hidden = true;
    if (!value) {
      last = null;
      result.textContent = "—";
      rate.textContent = "Enter an amount";
      renderAlso(null, {});
      return;
    }
    const id = ++requestId;
    try {
      const res = await getRates(from, [to, ...targets]);
      if (id !== requestId) return; // superseded by newer input
      const rateOf = (code: CurrencyCode) => (code === from ? 1 : res.rates[code]?.rate);
      const r = rateOf(to);
      if (!r) throw new Error("UNSUPPORTED_CURRENCY");
      last = { amount: value, from, to, value: value * r };
      result.textContent = formatMoney(last.value, to);
      rate.textContent = `1 ${from} = ${r.toPrecision(5)} ${to} · ${res.stale ? "offline, " : ""}${ageLabel(res.timestamp)}`;
      // Name whichever service supplied the numbers (ExchangeRate-API requires attribution).
      source.replaceChildren(res.source === "open-er-api"
        ? h("a", { href: "https://www.exchangerate-api.com", target: "_blank", rel: "noopener" }, "Rates by ExchangeRate-API")
        : "Daily reference rates · no account needed");
      renderAlso(value, Object.fromEntries(targets.map((c) => [c, rateOf(c)])));
      clearTimeout(historyTimer);
      historyTimer = setTimeout(() => addHistory(last), 1200);
    } catch (err) {
      if (id !== requestId) return;
      last = null;
      result.textContent = "—";
      rate.textContent = " ";
      error.hidden = false;
      error.textContent = (err as Error).message === "UNSUPPORTED_CURRENCY" ? "This pair isn't available right now." : "Couldn't reach the rate service. Check your connection.";
    }
  }

  function renderAlso(value: number | null, rates: Record<string, number | undefined>) {
    const codes = targets.filter((c) => c !== pair.from && c !== pair.to);
    if (!codes.length) return also.replaceChildren(h("div", { class: "empty" }, "Add more currencies in Settings."));
    also.replaceChildren(...codes.map((code) =>
      h("button", { class: "row", title: `Convert to ${code}`, onclick: () => { setPair(pair.from, code); convert(); } },
        flag(code),
        h("span", { class: "text" }, h("b", {}, code), h("small", {}, CURRENCY_BY_CODE[code].name)),
        h("span", { class: "num" }, value && rates[code] ? formatMoney(value * rates[code]!, code) : "—")
      )
    ));
  }

  // ─── Picker ──────────────────────────────────────────────────────────────
  function openPicker(which: "from" | "to") {
    picking = which;
    pickerSearch.value = "";
    renderPicker();
    picker.hidden = false;
    pickerSearch.focus();
  }
  function closePicker() {
    picker.hidden = true;
    (picking === "from" ? fromBtn : toBtn).focus();
    picking = null;
  }
  function choose(code: CurrencyCode) {
    const other = picking === "from" ? pair.to : pair.from;
    // Picking the other side's currency swaps them.
    if (picking === "from") setPair(code, code === other ? pair.from : other);
    else setPair(code === other ? pair.to : other, code);
    closePicker();
    convert();
  }
  function renderPicker() {
    const q = pickerSearch.value.trim().toLowerCase();
    const selected = picking ? pair[picking] : null;
    const list = CURRENCIES.filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .sort((a, b) => Number(targets.includes(b.code)) - Number(targets.includes(a.code)));
    pickerList.replaceChildren(...(list.length ? list.map((c) =>
      h("button", { class: "pick", role: "option", "aria-selected": String(c.code === selected), onclick: () => choose(c.code) },
        flag(c.code), h("b", {}, c.code), h("span", {}, c.name))
    ) : [h("div", { class: "empty" }, "No matches")]));
  }
  fromBtn.addEventListener("click", () => openPicker("from"));
  toBtn.addEventListener("click", () => openPicker("to"));
  pickerSearch.addEventListener("input", renderPicker);
  pickerSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pickerList.querySelector<HTMLElement>(".pick")?.click();
    if (e.key === "ArrowDown") { e.preventDefault(); pickerList.querySelector<HTMLElement>(".pick")?.focus(); }
  });
  pickerList.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const active = (root.getRootNode() as Document | ShadowRoot).activeElement;
    const sib = e.key === "ArrowDown" ? active?.nextElementSibling : active?.previousElementSibling;
    ((sib as HTMLElement | null) ?? pickerSearch).focus();
  });
  pickerDone.addEventListener("click", closePicker);
  picker.addEventListener("click", (e) => { if (e.target === picker) closePicker(); });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (!picker.hidden) closePicker();
    else onClose?.();
  });

  // ─── History ─────────────────────────────────────────────────────────────
  function addHistory(entry: typeof last) {
    if (!entry) return;
    const same = (x: typeof items[number]) => x.amount === entry.amount && x.from === entry.from && x.to === entry.to;
    items = [{ ...entry, at: Date.now() }, ...items.filter((x) => !same(x))].slice(0, MAX_HISTORY);
    chrome.storage.local.set({ history: items });
    renderHistory();
  }
  function renderHistory() {
    clearHistory.hidden = !items.length;
    if (!items.length) return history.replaceChildren(h("div", { class: "empty" }, "Your conversions will appear here."));
    history.replaceChildren(...items.map((item) =>
      h("button", {
        class: "row hist-row",
        title: ageLabel(item.at),
        onclick: () => {
          amount.value = formatAmount(item.amount, item.from).replace(/,/g, "");
          setPair(item.from, item.to);
          convert();
        }
      }, flag(item.from), h("span", { class: "text" }, formatMoney(item.amount, item.from)), h("span", { class: "num" }, formatMoney(item.value, item.to)), flag(item.to))
    ));
  }
  const validHistory = (list: unknown) =>
    Array.isArray(list)
      ? list.filter((x) => x && isCurrencyCode(x.from) && isCurrencyCode(x.to) && Number.isFinite(x.amount) && Number.isFinite(x.value)).slice(0, MAX_HISTORY)
      : [];

  // ─── Events ──────────────────────────────────────────────────────────────
  amount.addEventListener("input", () => {
    setPair(pair.from, pair.to);
    clearTimeout(debounce);
    debounce = setTimeout(convert, 150);
  });
  amount.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { clearTimeout(historyTimer); convert().then(() => addHistory(last)); }
  });
  swap.addEventListener("click", () => { setPair(pair.to, pair.from); convert(); });
  copy.addEventListener("click", async () => {
    if (!last) return;
    try {
      await navigator.clipboard.writeText(formatMoney(last.value, last.to));
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy blocked";
    }
    setTimeout(() => (copy.textContent = "Copy"), 1200);
  });
  clearHistory.addEventListener("click", () => {
    items = [];
    chrome.storage.local.set({ history: items });
    renderHistory();
  });
  const setStatus = () => (status.textContent = toggle.checked ? "On for web pages" : "Off for web pages");
  toggle.addEventListener("change", () => { chrome.storage.sync.set({ enabled: toggle.checked }); setStatus(); });
  settingsBtn.addEventListener("click", onOpenSettings);
  closeBtn?.addEventListener("click", () => onClose?.());

  // ─── Glass ───────────────────────────────────────────────────────────────
  let glasses: GlassController[] = [];
  let current = appearance;
  const mountAll = () => {
    // A narrow lens rim keeps refraction at the borders, where it reads as glass.
    glasses = [...root.querySelectorAll<HTMLElement>(".glass")].map((node) => mountGlass(node, current, { bezel: (a) => (a.liquid ? 40 : 26) }));
  };

  // ─── Boot ────────────────────────────────────────────────────────────────
  (async () => {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(["enabled", "targetCurrencies", "targetCurrency"]),
      chrome.storage.local.get(["popupState", "history"])
    ]);
    toggle.checked = sync.enabled !== false;
    setStatus();
    const saved = Array.isArray(sync.targetCurrencies) ? sync.targetCurrencies.filter(isCurrencyCode) : [];
    if (saved.length) targets = saved;
    else if (isCurrencyCode(sync.targetCurrency)) targets = [sync.targetCurrency];
    const state = (local.popupState ?? {}) as { from?: unknown; to?: unknown; amount?: unknown };
    const from = isCurrencyCode(state.from) ? state.from : "USD";
    const to = isCurrencyCode(state.to) && state.to !== from ? state.to : targets.find((c) => c !== from) ?? "EUR";
    if (typeof state.amount === "string" && state.amount) amount.value = state.amount;
    setPair(from, to);
    items = validHistory(local.history);
    renderHistory();
    convert();
  })();

  return {
    root,
    handle: header,
    setAppearance(a) {
      current = a;
      if (!glasses.length) mountAll();
      glasses.forEach((g) => g.update(a));
    },
    focus() {
      amount.focus();
      amount.select();
    },
    pulse() {
      glasses.forEach((g) => g.pulse());
    },
    destroy() {
      glasses.forEach((g) => g.destroy());
      root.remove();
    }
  };
}
