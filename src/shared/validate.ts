import { isCurrencyCode } from "./currencies.ts";
import {
  MAX_DOMAIN_OVERRIDES,
  MAX_LABEL_LENGTH,
  MAX_TARGET_CURRENCIES,
  MAX_URL_LENGTH,
  type ErrorCode,
  type ErrorEnvelope,
  type RateSnapshot,
  type RuntimeMessage,
  type Settings,
  type WorkspaceRecord
} from "./contracts.ts";

const ERROR_CODES = new Set<ErrorCode>([
  "NETWORK",
  "TIMEOUT",
  "PROVIDER",
  "INVALID_REQUEST",
  "UNSUPPORTED_CURRENCY",
  "NOT_FOUND",
  "STORAGE"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.length > 0);
}

function isCurrencyList(value: unknown): value is Settings["targetCurrencies"] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_TARGET_CURRENCIES &&
    value.every(isCurrencyCode) &&
    new Set(value).size === value.length
  );
}

export function isWorkspaceRecord(value: unknown): value is WorkspaceRecord {
  if (!isRecord(value)) return false;
  if (!isBoundedString(value.id, 64) || !isBoundedString(value.label, MAX_LABEL_LENGTH)) return false;
  if (!Number.isFinite(value.amount) || (value.amount as number) <= 0) return false;
  if (!isCurrencyCode(value.currency) || !Number.isFinite(value.createdAt)) return false;
  if (value.title !== undefined && !isBoundedString(value.title, MAX_LABEL_LENGTH, true)) return false;
  if (value.url === undefined) return true;
  if (!isBoundedString(value.url, MAX_URL_LENGTH)) return false;
  try {
    return ["http:", "https:"].includes(new URL(value.url).protocol);
  } catch {
    return false;
  }
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "GET_RATE":
      return isCurrencyCode(value.base) && isCurrencyCode(value.target);
    case "GET_RATES_MULTI":
      return isCurrencyCode(value.base) && isCurrencyList(value.targets);
    case "SET_ENABLED":
      return typeof value.value === "boolean";
    case "SET_TARGET_CURRENCIES":
      return isCurrencyList(value.value);
    case "OPEN_OPTIONS":
      return Object.keys(value).length === 1;
    case "PIN_PRICE":
      return isWorkspaceRecord(value.price);
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
    rates.length <= 50 &&
    rates.every(([code, rate]) => isCurrencyCode(code) && Number.isFinite(rate) && (rate as number) > 0)
  );
}

export function isSettings(value: unknown): value is Settings {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (
    typeof value.enabled !== "boolean" ||
    typeof value.selectionMode !== "boolean" ||
    typeof value.underline !== "boolean" ||
    !isCurrencyCode(value.defaultCurrency) ||
    !isCurrencyList(value.targetCurrencies) ||
    !isRecord(value.domainOverrides)
  ) {
    return false;
  }
  const overrides = Object.entries(value.domainOverrides);
  return (
    overrides.length <= MAX_DOMAIN_OVERRIDES &&
    overrides.every(([domain, code]) => domain.length > 0 && domain.length <= 253 && isCurrencyCode(code))
  );
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    ERROR_CODES.has(value.code as ErrorCode) &&
    isBoundedString(value.message, 240) &&
    typeof value.retryable === "boolean"
  );
}
