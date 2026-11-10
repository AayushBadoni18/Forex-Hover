import { CURRENCIES, flagRegion, type CurrencyCode } from "./currencies.ts";
import type { PriceCandidate } from "./price-parser.ts";

export type ResolveReason =
  | "explicit-code"
  | "unique-symbol"
  | "domain-override"
  | "document-region"
  | "hostname-region"
  | "user-default"
  | "first-candidate";

export interface Resolution {
  currency: CurrencyCode;
  confidence: "certain" | "high" | "medium" | "low";
  reason: ResolveReason;
}

export interface ResolveContext {
  hostname?: string;
  language?: string;
  defaultCurrency?: CurrencyCode;
  domainOverrides?: Record<string, CurrencyCode>;
}

// Region → currency, derived from the catalog's flag emoji (🇨🇦 → CA), plus the euro area.
const REGION_CURRENCY: Record<string, CurrencyCode> = Object.fromEntries(
  CURRENCIES.flatMap(({ code }) => {
    const region = flagRegion(code).toUpperCase();
    return region !== "EU" ? [[region, code]] : [];
  })
);
for (const r of "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ")) REGION_CURRENCY[r] = "EUR";
REGION_CURRENCY.UK = "GBP";

// Second-level labels under a ccTLD that act as public suffixes (co.uk, com.au, …).
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "ac", "edu", "ne", "or"]);
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** A bare, registrable hostname (no scheme/path), or null. Rejects public-suffix-like keys. */
export function normalizeDomain(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/^www\./, "");
  if (!HOSTNAME.test(host)) return null;
  const labels = host.split(".");
  if (labels.length === 2 && SECOND_LEVEL.has(labels[0]) && labels[1].length === 2) return null;
  return host;
}

function overrideFor(hostname: string, overrides: Record<string, CurrencyCode>): CurrencyCode | null {
  let best: string | null = null;
  for (const key of Object.keys(overrides)) {
    const domain = normalizeDomain(key);
    if (!domain || domain !== key) continue;
    if ((hostname === domain || hostname.endsWith(`.${domain}`)) && (!best || domain.length > best.length)) best = domain;
  }
  return best ? overrides[best] : null;
}

function regionOf(language?: string): string | null {
  try {
    return language ? new Intl.Locale(language).maximize().region ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Decides which currency an ambiguous price means, with an explainable reason.
 * Precedence: explicit code > unique symbol > site rule > page language region
 * > hostname ccTLD > user default > first catalog candidate.
 */
export function resolveCurrency(candidate: PriceCandidate, ctx: ResolveContext): Resolution {
  const { kind, currencyCodes } = candidate.evidence;
  if (kind === "code") return { currency: currencyCodes[0], confidence: "certain", reason: "explicit-code" };
  if (currencyCodes.length === 1) return { currency: currencyCodes[0], confidence: "certain", reason: "unique-symbol" };

  const hostname = ctx.hostname?.toLowerCase().replace(/^www\./, "") ?? "";
  const override = hostname && ctx.domainOverrides ? overrideFor(hostname, ctx.domainOverrides) : null;
  if (override) return { currency: override, confidence: "high", reason: "domain-override" };

  const fits = (code: CurrencyCode | undefined | null): code is CurrencyCode => !!code && currencyCodes.includes(code);
  // Only an explicit region in the page language counts ("en-CA"), not a guessed one ("en" → US).
  const langRegion = ctx.language && /[-_][a-z]{2}\b/i.test(ctx.language) ? regionOf(ctx.language) : null;
  const byLanguage = langRegion ? REGION_CURRENCY[langRegion] : null;
  if (fits(byLanguage)) return { currency: byLanguage, confidence: "medium", reason: "document-region" };

  const byHost = REGION_CURRENCY[hostname.split(".").at(-1)?.toUpperCase() ?? ""];
  if (fits(byHost)) return { currency: byHost, confidence: "medium", reason: "hostname-region" };

  if (fits(ctx.defaultCurrency)) return { currency: ctx.defaultCurrency, confidence: "low", reason: "user-default" };
  return { currency: currencyCodes[0], confidence: "low", reason: "first-candidate" };
}
