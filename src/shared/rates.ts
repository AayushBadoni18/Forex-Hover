import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "./currencies.ts";
import type { RateSnapshot } from "./contracts.ts";
import { isRateSnapshot } from "./validate.ts";

// Both providers publish once a day; 6h keeps us fresh without hammering them.
export const SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
// Past the TTL but under a day old, a snapshot is still that day's rates: use it now, refresh quietly.
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8_000;

type Fetch = typeof fetch;
export interface SnapshotStore {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

function pickRates(raw: unknown, toCode: (code: CurrencyCode) => string): RateSnapshot["rates"] {
  if (typeof raw !== "object" || raw === null) throw new Error("PROVIDER");
  const source = raw as Record<string, unknown>;
  const rates: RateSnapshot["rates"] = {};
  for (const code of CURRENCY_CODES) {
    const rate = source[toCode(code)];
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[code] = rate;
  }
  if (!Object.keys(rates).length) throw new Error("PROVIDER");
  return rates;
}

async function getJson(fetchFn: Fetch, url: string): Promise<any> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`PROVIDER ${response.status}`);
  return response.json();
}

/** Fallback: ExchangeRate-API open endpoint (keyless; attribution shown when used). */
async function fromOpenErApi(fetchFn: Fetch, base: CurrencyCode) {
  const data = await getJson(fetchFn, `https://open.er-api.com/v6/latest/${base}`);
  if (data?.result !== "success") throw new Error("PROVIDER");
  return { rates: pickRates(data.rates, (code) => code), source: "open-er-api" as const };
}

/** Primary: fawazahmed0 currency-api on jsDelivr (keyless, free, no attribution required). */
async function fromCurrencyApi(fetchFn: Fetch, base: CurrencyCode) {
  const key = base.toLowerCase();
  const data = await getJson(
    fetchFn,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${key}.json`
  );
  return { rates: pickRates(data?.[key], (code) => code.toLowerCase()), source: "currency-api" as const };
}

/** USD rates as published on a past day ("2026-11-04"); currency-api keeps every day's file. */
export async function fetchHistoricalRates(date: string, fetchFn: Fetch = fetch): Promise<RateSnapshot["rates"]> {
  const data = await getJson(fetchFn, `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`);
  return { ...pickRates(data?.usd, (code) => code.toLowerCase()), USD: 1 };
}

export async function fetchSnapshot(base: CurrencyCode, fetchFn: Fetch = fetch, now = Date.now()) {
  let result;
  try {
    result = await fromCurrencyApi(fetchFn, base);
  } catch {
    result = await fromOpenErApi(fetchFn, base);
  }
  const snapshot: RateSnapshot = {
    base,
    rates: { ...result.rates, [base]: 1 },
    fetchedAt: now,
    expiresAt: now + SNAPSHOT_TTL_MS,
    source: result.source
  };
  return snapshot;
}

export interface SnapshotResult {
  snapshot: RateSnapshot;
  stale: boolean;
}

/**
 * One validated snapshot per base, deduplicated while in flight. When the
 * network fails, the last good snapshot is returned and marked stale.
 */
export function createRateCache(store: SnapshotStore, fetchFn: Fetch = fetch, clock = Date.now) {
  const inFlight = new Map<CurrencyCode, Promise<SnapshotResult>>();
  const refreshing = new Set<CurrencyCode>();

  async function refresh(base: CurrencyCode, key: string) {
    const snapshot = await fetchSnapshot(base, fetchFn, clock());
    await store.set({ [key]: snapshot });
    return snapshot;
  }

  async function load(base: CurrencyCode): Promise<SnapshotResult> {
    const key = `snapshot_${base}`;
    const cached = (await store.get(key))[key];
    const valid = isRateSnapshot(cached) && cached.base === base ? cached : null;
    if (valid && valid.expiresAt > clock()) return { snapshot: valid, stale: false };
    if (valid && clock() - valid.fetchedAt < SNAPSHOT_MAX_AGE_MS) {
      if (!refreshing.has(base)) {
        refreshing.add(base);
        refresh(base, key).catch(() => {}).finally(() => refreshing.delete(base));
      }
      return { snapshot: valid, stale: false };
    }
    try {
      return { snapshot: await refresh(base, key), stale: false };
    } catch (error) {
      if (valid) return { snapshot: valid, stale: true };
      throw error;
    }
  }

  return function getSnapshot(base: CurrencyCode): Promise<SnapshotResult> {
    if (!isCurrencyCode(base)) return Promise.reject(new Error("UNSUPPORTED_CURRENCY"));
    let pending = inFlight.get(base);
    if (!pending) {
      pending = load(base).finally(() => inFlight.delete(base));
      inFlight.set(base, pending);
    }
    return pending;
  };
}
