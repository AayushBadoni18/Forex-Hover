import { CURRENCY_BY_CODE } from "../shared/currencies.ts";
import { formatMoney } from "../shared/format.ts";
import { ageLabel, countUp, h } from "./dom.ts";

/** Tooltip styles shared by the page tooltip and the settings preview. */
export const TOOLTIP_CSS = `
:host { all: initial; position: fixed; inset: 0 auto auto 0; z-index: 2147483647; pointer-events: none; }
.root { position: fixed; top: 0; left: 0; }
.pop {
  zoom: var(--ui-scale, 1);
  opacity: 0;
  transform: translateY(8px) scale(0.92);
  transform-origin: top left;
  transition: opacity 0.18s var(--ease), transform 0.45s var(--spring);
}
.pop.up { transform-origin: bottom left; transform: translateY(-8px) scale(0.92); }
.pop.visible { opacity: 1; transform: none; }
.card { min-width: 248px; max-width: 360px; padding: 14px 14px 10px; font-size: 13px; line-height: 1.35; }
.badge {
  display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px; color: var(--fg-2);
  padding: 3px 8px; border-radius: 999px; background: var(--fill);
}
.head { display: flex; align-items: baseline; gap: 8px; padding: 0 2px 10px; }
.from { font-size: 21px; font-weight: 650; letter-spacing: -0.4px; font-variant-numeric: tabular-nums; }
.chip {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px; color: var(--fg-2);
  padding: 2px 7px; border-radius: 999px; border: 1px solid var(--hairline);
}
.rows { display: flex; flex-direction: column; gap: 2px; }
.row {
  display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 8px;
  padding: 7px 8px; border-radius: 12px; background: var(--fill);
  animation: rowIn 0.5s var(--spring) both; animation-delay: calc(var(--i) * 40ms);
}
.flag { font-size: 17px; line-height: 1; }
.code { font-size: 12px; font-weight: 650; letter-spacing: 0.3px; }
.name { font-size: 10.5px; color: var(--fg-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.val { text-align: right; }
.amount { font-size: 15px; font-weight: 650; letter-spacing: -0.2px; color: var(--accent-text); font-variant-numeric: tabular-nums; }
.rate { font-size: 10px; color: var(--fg-3); font-variant-numeric: tabular-nums; }
.na { font-size: 11px; color: var(--fg-3); text-align: right; }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 4px 0; font-size: 10px; color: var(--fg-3); }
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin-right: 5px; box-shadow: 0 0 8px var(--accent); }
.dot.stale { background: #ff9f0a; box-shadow: 0 0 8px #ff9f0a; }
.skel { height: 34px; border-radius: 12px; background: linear-gradient(90deg, var(--fill) 0%, var(--fill-2) 50%, var(--fill) 100%); background-size: 200% 100%; animation: shimmer 1.1s linear infinite; }
.skel.short { height: 22px; width: 55%; margin-bottom: 10px; }
.err { padding: 4px 2px 6px; color: #ff6961; font-size: 12.5px; }
@keyframes rowIn { from { opacity: 0; transform: translateY(6px) scale(0.97); } }
@keyframes shimmer { to { background-position: -200% 0; } }
`;

export interface ResultView {
  amount: number;
  originalCurrency: string;
  rates: Record<string, { success: boolean; rate?: number; timestamp?: number; stale?: boolean }>;
  isSelection?: boolean;
  stale?: boolean;
  source?: string;
  instant?: boolean;
}

export function buildResult({ amount, originalCurrency, rates, isSelection, stale, source, instant = false }: ResultView) {
  const entries = Object.entries(rates);
  const timestamps = entries.flatMap(([, r]) => (r.success && r.timestamp ? [r.timestamp] : []));
  const isStale = stale || entries.some(([, r]) => r.stale);
  const money = (n: number, code: string) => formatMoney(n, code as never);

  const rows = entries.map(([code, entry], i) => {
    const meta = (CURRENCY_BY_CODE as Record<string, { flag: string; name: string } | undefined>)[code];
    const label = h("div", {}, h("div", { class: "code" }, code), h("div", { class: "name" }, meta?.name ?? ""));
    const flag = h("span", { class: "flag" }, meta?.flag ?? "🌐");
    if (!entry.success || !entry.rate) {
      return h("div", { class: "row", style: `--i:${i}` }, flag, label, h("div", { class: "na" }, "unavailable"));
    }
    const amountEl = h("div", { class: "amount" });
    countUp(amountEl, amount * entry.rate, (n) => money(n, code), instant);
    return h("div", { class: "row", style: `--i:${i}` }, flag, label,
      h("div", { class: "val" }, amountEl, h("div", { class: "rate" }, `1 ${originalCurrency} = ${entry.rate.toPrecision(5)}`))
    );
  });

  const updated = timestamps.length ? ageLabel(Math.max(...timestamps)) : "";
  return [
    isSelection ? h("div", { class: "badge" }, "✂︎ Selection") : null,
    h("div", { class: "head" },
      h("span", { class: "from" }, money(amount, originalCurrency)),
      h("span", { class: "chip" }, originalCurrency)
    ),
    h("div", { class: "rows" }, ...rows),
    h("div", { class: "foot" },
      h("span", {}, h("span", { class: `dot${isStale ? " stale" : ""}` }), isStale ? `Offline · rates from ${updated}` : `Reference rate · ${updated}`),
      h("span", {}, source === "currency-api" ? "fawazahmed0/currency-api" : "Rates by ExchangeRate-API")
    )
  ].filter((n) => n !== null);
}
