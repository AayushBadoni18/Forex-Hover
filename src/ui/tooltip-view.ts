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
  transform: translateY(4px) scale(0.92);
  transform-origin: top left;
  filter: blur(4px);
  transition: opacity 0.18s var(--ease), transform 0.42s cubic-bezier(0.2, 1.2, 0.35, 1), filter 0.22s var(--ease);
}
.pop.up { transform-origin: bottom left; transform: translateY(-4px) scale(0.92); }
.pop.visible { opacity: 1; transform: none; filter: none; }
/* Thick glass: a clear, refracting lens rim around a frosted reading plate.
   interpolate-size lets the card morph smoothly from loading to result. */
.tt-card {
  width: 280px; padding: 16px 18px 12px; font-size: 13px; line-height: 1.32;
  interpolate-size: allow-keywords; height: auto; overflow: hidden;
  transition: height 0.32s cubic-bezier(0.2, 1, 0.35, 1);
}
/* Thick glass: the outer band stays clear so the page visibly bends through
   it; the reading plate inside is lightly frosted and fades in from the rim. */
.tt-plate {
  z-index: 1; inset: 7px; border-radius: calc(var(--lg-radius) - 7px);
  background: rgb(28 28 30 / max(var(--lg-tint-a), 0.5));
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  --feather: 12px;
  -webkit-mask:
    linear-gradient(to right, transparent, #000 var(--feather), #000 calc(100% - var(--feather)), transparent),
    linear-gradient(to bottom, transparent, #000 var(--feather), #000 calc(100% - var(--feather)), transparent);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
[data-theme="light"] .tt-plate { background: rgb(255 255 255 / max(var(--lg-tint-a), 0.64)); }
.lg-spec { z-index: 2; }
.tt-head { display: flex; align-items: center; gap: 12px; }
.tt-from { font-size: 23px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.tt-note { margin-top: 4px; font-size: 11.5px; color: var(--fg-2); }
.tt-badge { font-size: 11px; color: var(--fg-2); margin-bottom: 4px; }
.tt-rows { margin-top: 9px; border-top: 0.5px solid var(--hairline); }
.tt-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 0.5px solid var(--hairline); }
.tt-row:last-child { border-bottom: 0; }
.tt-row .flag, .tt-head .flag { width: 26px; height: 19px; border-radius: 4.5px; }
.tt-amount { font-size: 17px; font-weight: 700; letter-spacing: -0.015em; font-variant-numeric: tabular-nums; }
.tt-rate { font-size: 12px; font-weight: 500; color: var(--fg-2); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.tt-na { font-size: 13px; color: var(--fg-3); }
.tt-foot { display: flex; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 0.5px solid var(--hairline); font-size: 11px; color: var(--fg-2); }
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

/** Frosted inner plate for the thick-glass look; call after mountGlass(). */
export function addPlate(card: HTMLElement) {
  const plate = h("span", { class: "lg-layer tt-plate", "aria-hidden": "true" });
  card.querySelector(".lg-spec")?.before(plate);
  return plate;
}

export function buildLoading() {
  return [h("div", { class: "tt-skel tt-wide" }), h("div", { class: "tt-skel" }), h("div", { class: "tt-skel" })];
}

export function buildResult({ amount, originalCurrency, rates, isSelection, stale, source, reason }: ResultView) {
  const entries = Object.entries(rates);
  const timestamps = entries.flatMap(([, r]) => (r.success && r.timestamp ? [r.timestamp] : []));
  const isStale = stale || entries.some(([, r]) => r.stale);
  const assumed = reason && REASONS[reason];

  // Words like "INR / Indian Rupee" are replaced by the flag and the currency's
  // own symbol; the full name stays available to screen readers and on hover.
  const nameOf = (code: string) => (isCurrencyCode(code) ? CURRENCY_BY_CODE[code].name : code);
  const symbolOf = (code: string) => (isCurrencyCode(code) ? CURRENCY_BY_CODE[code].symbol : code);
  const namedFlag = (code: string) => {
    const img = flag(code);
    img.alt = nameOf(code);
    img.title = nameOf(code);
    return img;
  };

  const rows = entries.map(([code, entry]) => {
    if (!entry.success || !entry.rate) {
      return h("div", { class: "tt-row", title: nameOf(code) }, namedFlag(code), h("div", { class: "tt-na" }, "Unavailable"));
    }
    const converted = money(amount * entry.rate, code);
    return h("div", { class: "tt-row", title: nameOf(code), "aria-label": `${nameOf(code)}: ${converted}` },
      namedFlag(code),
      h("div", { class: "tt-amount" }, converted),
      h("div", { class: "tt-rate" }, `${symbolOf(originalCurrency)}1 = ${symbolOf(code)}${entry.rate.toPrecision(4)}`)
    );
  });

  const updated = timestamps.length ? ageLabel(Math.max(...timestamps)) : "";
  return [
    isSelection ? h("div", { class: "tt-badge" }, "Selected text") : null,
    h("div", { class: "tt-head", title: nameOf(originalCurrency) }, namedFlag(originalCurrency), h("span", { class: "tt-from" }, money(amount, originalCurrency))),
    assumed ? h("div", { class: "tt-note" }, `Read as ${symbolOf(originalCurrency)} from ${assumed}`) : null,
    h("div", { class: "tt-rows" }, ...rows),
    h("div", { class: "tt-foot" },
      h("span", {}, h("span", { class: `tt-dot${isStale ? " tt-stale" : ""}` }), isStale ? `Offline · ${updated}` : `Updated ${updated}`),
      h("span", {}, source === "open-er-api" ? "Rates by ExchangeRate-API" : "Daily reference rates")
    )
  ].filter((n) => n !== null);
}
