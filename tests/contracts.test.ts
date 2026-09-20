import assert from "node:assert/strict";
import test from "node:test";
import type { RateSnapshot, Settings, WorkspaceRecord } from "../src/shared/contracts.ts";
import {
  isErrorEnvelope,
  isRateSnapshot,
  isRuntimeMessage,
  isSettings,
  isWorkspaceRecord
} from "../src/shared/validate.ts";

const snapshot: RateSnapshot = {
  base: "USD",
  rates: { EUR: 0.85, JPY: 150 },
  fetchedAt: 1_700_000_000_000,
  expiresAt: 1_700_001_800_000,
  source: "frankfurter"
};

const settings: Settings = {
  schemaVersion: 1,
  enabled: true,
  selectionMode: true,
  underline: false,
  defaultCurrency: "USD",
  targetCurrencies: ["EUR", "GBP"],
  domainOverrides: { "amazon.co.uk": "GBP" }
};

const workspaceRecord: WorkspaceRecord = {
  id: "price-1",
  amount: 49.99,
  currency: "USD",
  label: "Annual plan",
  url: "https://example.com/pricing",
  createdAt: 1_700_000_000_000
};

test("runtime message validation accepts only bounded known messages", () => {
  assert.equal(isRuntimeMessage({ type: "GET_RATE", base: "USD", target: "EUR" }), true);
  assert.equal(
    isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: ["EUR", "GBP"] }),
    true
  );
  assert.equal(isRuntimeMessage({ type: "UNKNOWN" }), false);
  assert.equal(isRuntimeMessage({ type: "GET_RATE", base: "USD", target: "BTC" }), false);
  assert.equal(
    isRuntimeMessage({ type: "GET_RATES_MULTI", base: "USD", targets: Array(11).fill("EUR") }),
    false
  );
  assert.equal(isRuntimeMessage({ type: "PIN_PRICE", price: { ...workspaceRecord, amount: NaN } }), false);
});

test("snapshot validation rejects malformed, oversized, and non-finite rates", () => {
  assert.equal(isRateSnapshot(snapshot), true);
  assert.equal(isRateSnapshot({ ...snapshot, rates: { EUR: Infinity } }), false);
  assert.equal(isRateSnapshot({ ...snapshot, base: "BTC" }), false);
  assert.equal(
    isRateSnapshot({ ...snapshot, rates: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`X${i}`, 1])) }),
    false
  );
});

test("settings and workspace records enforce collection and string caps", () => {
  assert.equal(isSettings(settings), true);
  assert.equal(isSettings({ ...settings, enabled: "yes" }), false);
  assert.equal(isSettings({ ...settings, targetCurrencies: Array(11).fill("EUR") }), false);
  assert.equal(isWorkspaceRecord(workspaceRecord), true);
  assert.equal(isWorkspaceRecord({ ...workspaceRecord, label: "x".repeat(121) }), false);
  assert.equal(isWorkspaceRecord({ ...workspaceRecord, url: "x".repeat(2049) }), false);
});

test("error envelopes have stable bounded fields", () => {
  assert.equal(
    isErrorEnvelope({ code: "NETWORK", message: "Provider unavailable", retryable: true }),
    true
  );
  assert.equal(isErrorEnvelope({ code: "WHATEVER", message: "bad", retryable: false }), false);
  assert.equal(
    isErrorEnvelope({ code: "NETWORK", message: "x".repeat(241), retryable: true }),
    false
  );
});
