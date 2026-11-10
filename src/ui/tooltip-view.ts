import { CURRENCY_BY_CODE, isCurrencyCode } from "../shared/currencies.ts";
import { formatMoney } from "../shared/format.ts";
import { ageLabel, h } from "./dom.ts";
import { flag, FLAG_CSS } from "./flag.ts";

/** Tooltip styles shared by the page tooltip and the settings preview. */
export const TOOLTIP_CSS = `
:host { all: initial; position: fixed; inset: 0 auto auto 0; z-index: 2147483647; pointer-events: none; }
.root { position: fixed; top: 0; left: 0; }
.pop {
  zoom: var(--ui-scale, 1);
  opacity: 0;
  transform: scale(0.98);
  transform-origin: top left;
  transition: opacity 0.14s var(--ease), transform 0.14s var(--ease);
}
.pop.up { transform-origin: bottom left; }
.pop.visible { opacity: 1; transform: none; }
.tt-card { width: 272px; padding: 12px 14px 10px; font-size: 13px; line-height: 1.3; }
.tt-head { display: flex; align-items: center; gap: 8px; }
.tt-from { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.tt-code-chip { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--fg-2); letter-spacing: 0.02em; }
.tt-note { margin-top: 3px; font-size: 11px; color: var(--fg-2); }
.tt-badge { font-size: 11px; color: var(--fg-2); margin-bottom: 4px; }
.tt-rows { margin-top: 8px; border-top: 0.5px solid var(--hairline); }
.tt-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid var(--hairline); }
.tt-row:last-child { border-bottom: 0; }
.tt-label { min-width: 0; flex: 1; }
.tt-code { font-size: 13px; font-weight: 600; }
.tt-name { font-size: 11px; color: var(--fg-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tt-val { text-align: right; }
.tt-amount { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.tt-rate { font-size: 10.5px; color: var(--fg-3); font-variant-numeric: tabular-nums; }
.tt-na { font-size: 12px; color: var(--fg-3); }
.tt-foot { display: flex; justify-content: space-between; gap: 8px; padding-top: 7px; border-top: 0.5px solid var(--hairline); font-size: 10.5px; color: var(--fg-3); }
.tt-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #30d158; margin-right: 5px; vertical-align: 1px; }
.tt-dot.tt-stale { background: #ff9f0a; }
.tt-skel { height: 14px; border-radius: 7px; background: var(--fill); margin: 10px 0; }
.tt-skel.tt-wide { height: 22px; width: 60%; margin-top: 2px; }
.tt-err { padding: 2px 0 4px; color: #ff453a; font-size: 13px; }
${FLAG_CSS}
`;

const REASONS: Record<string, string> = {
  "domain-override": "your site rule",
  "document-region": "this page's language",
  "hostname-region": "this site's country",
  "user-default": "your home currency",
  "first-candidate": "the most common use"
};

export interface ResultView {
  amount: number;
  originalCurrency: string;
  rates: Record<string, { success: boolean; rate?: number; timestamp?: number; stale?: boolean }>;
  isSelection?: boolean;
  stale?: boolean;
  source?: string;
  reason?: string;
}

const money = (n: number, code: string) => (isCurrencyCode(code) ? formatMoney(n, code) : `${n.toFixed(2)} ${code}`);

export function buildLoading() {
  return [h("div", { class: "tt-skel tt-wide" }), h("div", { class: "tt-skel" }), h("div", { class: "tt-skel" })];
}

export function buildResult({ amount, originalCurrency, rates, isSelection, stale, source, reason }: ResultView) {
  const entries = Object.entries(rates);
  const timestamps = entries.flatMap(([, r]) => (r.success && r.timestamp ? [r.timestamp] : []));
  const isStale = stale || entries.some(([, r]) => r.stale);
  const assumed = reason && REASONS[reason];

  const rows = entries.map(([code, entry]) => {
    const meta = isCurrencyCode(code) ? CURRENCY_BY_CODE[code] : undefined;
    const label = h("div", { class: "tt-label" }, h("div", { class: "tt-code" }, code), h("div", { class: "tt-name" }, meta?.name ?? ""));
    if (!entry.success || !entry.rate) {
      return h("div", { class: "tt-row" }, flag(code), label, h("div", { class: "tt-na" }, "Unavailable"));
    }
    return h("div", { class: "tt-row" }, flag(code), label,
      h("div", { class: "tt-val" },
        h("div", { class: "tt-amount" }, money(amount * entry.rate, code)),
        h("div", { class: "tt-rate" }, `1 ${originalCurrency} = ${entry.rate.toPrecision(5)}`)
      )
    );
  });

  const updated = timestamps.length ? ageLabel(Math.max(...timestamps)) : "";
  return [
    isSelection ? h("div", { class: "tt-badge" }, "Selected text") : null,
    h("div", { class: "tt-head" }, flag(originalCurrency), h("span", { class: "tt-from" }, money(amount, originalCurrency)), h("span", { class: "tt-code-chip" }, originalCurrency)),
    assumed ? h("div", { class: "tt-note" }, `Read as ${originalCurrency} from ${assumed}`) : null,
    h("div", { class: "tt-rows" }, ...rows),
    h("div", { class: "tt-foot" },
      h("span", {}, h("span", { class: `tt-dot${isStale ? " tt-stale" : ""}` }), isStale ? `Offline · ${updated}` : `Updated ${updated}`),
      h("span", {}, source === "open-er-api" ? "Rates by ExchangeRate-API" : "Daily reference rates")
    )
  ].filter((n) => n !== null);
}
