import assert from "node:assert/strict";
import test from "node:test";
import { createRateCache, SNAPSHOT_MAX_AGE_MS, SNAPSHOT_TTL_MS } from "../src/shared/rates.ts";

const memoryStore = () => {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: async (key: string) => ({ [key]: data[key] }),
    set: async (items: Record<string, unknown>) => void Object.assign(data, items)
  };
};

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;
const primary = json({ usd: { usd: 1, eur: 0.9, inr: 84, bogus: 3, gbp: -1 } });

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
    url.includes("jsdelivr") ? json({}, false) : json({ result: "success", rates: { EUR: 0.91 } })) as typeof fetch;
  const { snapshot } = await createRateCache(memoryStore(), fetchFn)("USD");
  assert.equal(snapshot.source, "open-er-api");
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
  now = SNAPSHOT_MAX_AGE_MS + 1;
  const result = await get("USD");
  assert.equal(result.stale, true);
  assert.equal(result.snapshot.rates.EUR, 0.9);
  await assert.rejects(get("EUR"));
});

test("an expired snapshot under a day old answers at once and refreshes in the background", async () => {
  const store = memoryStore();
  let now = 0;
  let calls = 0;
  const fetchFn = (async () => (calls++, json({ usd: { usd: 1, eur: calls === 1 ? 0.9 : 0.95 } }))) as typeof fetch;
  const get = createRateCache(store, fetchFn, () => now);
  await get("USD");
  now = SNAPSHOT_TTL_MS + 1;
  const first = await get("USD");
  assert.equal(first.stale, false);
  assert.equal(first.snapshot.rates.EUR, 0.9);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 2);
  assert.equal((await get("USD")).snapshot.rates.EUR, 0.95);
});
