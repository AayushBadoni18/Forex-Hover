import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "./currencies.ts";
import { MAX_TARGET_CURRENCIES, type RateSnapshot, type RuntimeMessage } from "./contracts.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCurrencyList(value: unknown): value is CurrencyCode[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_TARGET_CURRENCIES &&
    value.every(isCurrencyCode) &&
    new Set(value).size === value.length
  );
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "GET_RATES_MULTI":
      return isCurrencyCode(value.base) && isCurrencyList(value.targets);
    case "OPEN_OPTIONS":
      return Object.keys(value).length === 1;
    default:
      return false;
  }
}

export function isRateSnapshot(value: unknown): value is RateSnapshot {
  if (!isRecord(value) || !isCurrencyCode(value.base) || !["open-er-api", "currency-api"].includes(value.source as string)) return false;
  if (!Number.isFinite(value.fetchedAt) || !Number.isFinite(value.expiresAt)) return false;
  if ((value.expiresAt as number) < (value.fetchedAt as number) || !isRecord(value.rates)) return false;
  const rates = Object.entries(value.rates);
  return (
    rates.length <= CURRENCY_CODES.length &&
    rates.every(([code, rate]) => isCurrencyCode(code) && Number.isFinite(rate) && (rate as number) > 0)
  );
}
