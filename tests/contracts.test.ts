import assert from "node:assert/strict";
import test from "node:test";
import type { RateSnapshot } from "../src/shared/contracts.ts";
import { isRateSnapshot, isRuntimeMessage } from "../src/shared/validate.ts";

const snapshot: RateSnapshot = {
  base: "USD",
  rates: { EUR: 0.85, JPY: 150 },
  fetchedAt: 1_700_000_000_000,
  expiresAt: 1_700_001_800_000,
  source: "open-er-api"
};

test("runtime message validation accepts only bounded known messages", () => {
  assert.equal(isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: ["EUR", "GBP"] }), true);
  assert.equal(isRuntimeMessage({ type: "OPEN_OPTIONS" }), true);
  assert.equal(isRuntimeMessage({ type: "OPEN_OPTIONS", url: "https://example.com" }), false);
  assert.equal(isRuntimeMessage({ type: "UNKNOWN" }), false);
  assert.equal(isRuntimeMessage(null), false);
  assert.equal(isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: ["BTC"] }), false);
  assert.equal(isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: ["EUR", "EUR"] }), false);
  assert.equal(isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: Array(11).fill("EUR") }), false);
});

test("snapshot validation rejects malformed, oversized, and non-finite rates", () => {
  assert.equal(isRateSnapshot(snapshot), true);
  assert.equal(isRateSnapshot({ ...snapshot, rates: { EUR: Infinity } }), false);
  assert.equal(isRateSnapshot({ ...snapshot, base: "BTC" }), false);
  assert.equal(
    isRateSnapshot({ ...snapshot, rates: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`X${i}`, 1])) }),
    false
  );
});
