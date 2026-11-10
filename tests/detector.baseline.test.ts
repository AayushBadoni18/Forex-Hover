import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { PRICE_FIXTURES, type ExpectedPrice } from "./fixtures/prices.ts";

interface LegacyDetector {
  detect(text: string): ExpectedPrice[];
}

const context = { window: {} as { PriceDetector?: LegacyDetector } };
runInNewContext(
  await readFile(new URL("../priceDetector.js", import.meta.url), "utf8"),
  context
);
const detector = context.window.PriceDetector;
assert.ok(detector);

for (const fixture of PRICE_FIXTURES) {
  const check = () =>
    assert.deepEqual(structuredClone(detector.detect(fixture.text)), fixture.expected);
  if (fixture.legacyFails) {
    test.todo(`${fixture.name}: ${fixture.legacyFails}`, check);
  } else {
    test(fixture.name, check);
  }
}
