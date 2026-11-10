import assert from "node:assert/strict";
import test from "node:test";
import { createRateCache, SNAPSHOT_TTL_MS } from "../src/shared/rates.ts";

const memoryStore = () => {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: async (key: string) => ({ [key]: data[key] }),
    set: async (items: Record<string, unknown>) => void Object.assign(data, items)
  };
};

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;
const primary = json({ result: "success", rates: { USD: 1, EUR: 0.9, INR: 84, BOGUS: 3, GBP: -1 } });

test("one request per base, deduplicated and cached", async () => {
  let calls = 0;
  const fetchFn = (async () => (calls++, primary)) as typeof fetch;
  const get = createRateCache(memoryStore(), fetchFn, () => 1000);
  const [a, b] = await Promise.all([get("USD"), get("USD")]);
  await get("USD");
  assert.equal(calls, 1);
  assert.equal(a, b);
  assert.deepEqual(a.snapshot.rates, { USD: 1, EUR: 0.9, INR: 84 });
  assert.equal(a.stale, false);
});

test("falls back to the secondary provider", async () => {
  const fetchFn = (async (url: string) =>
    url.includes("open.er-api") ? json({}, false) : json({ usd: { eur: 0.91 } })) as typeof fetch;
  const { snapshot } = await createRateCache(memoryStore(), fetchFn)("USD");
  assert.equal(snapshot.source, "currency-api");
  assert.equal(snapshot.rates.EUR, 0.91);
});

test("serves the last good snapshot as stale when offline", async () => {
  const store = memoryStore();
  let now = 0;
  let online = true;
  const fetchFn = (async () => {
    if (!online) throw new Error("offline");
    return primary;
  }) as typeof fetch;
  const get = createRateCache(store, fetchFn, () => now);
  await get("USD");
  online = false;
  now = SNAPSHOT_TTL_MS + 1;
  const result = await get("USD");
  assert.equal(result.stale, true);
  assert.equal(result.snapshot.rates.EUR, 0.9);
  await assert.rejects(get("EUR"));
});
