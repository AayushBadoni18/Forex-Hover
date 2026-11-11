import type { CurrencyCode } from "./currencies.ts";

export const MAX_TARGET_CURRENCIES = 10;
export const MAX_DOMAIN_OVERRIDES = 100;
export const MAX_PAUSED_SITES = 100;
export const MAX_FEE_PERCENT = 10;

/** The card-fee setting as a safe percentage (0 when unset or invalid). */
export function normalizeFee(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_FEE_PERCENT, Math.max(0, value)) : 0;
}

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
