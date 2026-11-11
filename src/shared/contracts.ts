import type { CurrencyCode } from "./currencies.ts";

export const MAX_TARGET_CURRENCIES = 10;
export const MAX_DOMAIN_OVERRIDES = 100;

export interface RateSnapshot {
  base: CurrencyCode;
  rates: Partial<Record<CurrencyCode, number>>;
  fetchedAt: number;
  expiresAt: number;
  source: "open-er-api" | "currency-api";
}

/** Messages the pages send to the service worker. */
export type RuntimeMessage =
  | { type: "GET_RATES_MULTI"; base: CurrencyCode; targets: CurrencyCode[] }
  | { type: "OPEN_OPTIONS" };
