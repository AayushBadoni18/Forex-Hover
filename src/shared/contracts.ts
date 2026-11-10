import type { CurrencyCode } from "./currencies.ts";

export const MAX_TARGET_CURRENCIES = 10;
export const MAX_DOMAIN_OVERRIDES = 100;
export const MAX_WORKSPACE_RECORDS = 50;
export const MAX_LABEL_LENGTH = 120;
export const MAX_URL_LENGTH = 2048;

export interface RateSnapshot {
  base: CurrencyCode;
  rates: Partial<Record<CurrencyCode, number>>;
  fetchedAt: number;
  expiresAt: number;
  source: "open-er-api" | "currency-api";
}

export interface Settings {
  schemaVersion: 1;
  enabled: boolean;
  selectionMode: boolean;
  underline: boolean;
  defaultCurrency: CurrencyCode;
  targetCurrencies: CurrencyCode[];
  domainOverrides: Record<string, CurrencyCode>;
}

export interface WorkspaceRecord {
  id: string;
  amount: number;
  currency: CurrencyCode;
  label: string;
  url?: string;
  title?: string;
  createdAt: number;
}

export type RuntimeMessage =
  | { type: "GET_RATE"; base: CurrencyCode; target: CurrencyCode }
  | { type: "GET_RATES_MULTI"; base: CurrencyCode; targets: CurrencyCode[] }
  | { type: "SET_ENABLED"; value: boolean }
  | { type: "SET_TARGET_CURRENCIES"; value: CurrencyCode[] }
  | { type: "PIN_PRICE"; price: WorkspaceRecord }
  | { type: "OPEN_OPTIONS" };

export type ErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "PROVIDER"
  | "INVALID_REQUEST"
  | "UNSUPPORTED_CURRENCY"
  | "NOT_FOUND"
  | "STORAGE";

export interface ErrorEnvelope {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ErrorEnvelope };
