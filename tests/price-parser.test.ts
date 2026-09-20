import assert from "node:assert/strict";
import test from "node:test";
import { detectPriceCandidates } from "../src/shared/price-parser.ts";
import { PRICE_FIXTURES } from "./fixtures/prices.ts";

for (const fixture of PRICE_FIXTURES) {
  test(`parser: ${fixture.name}`, () => {
    const actual = detectPriceCandidates(fixture.text);
    assert.deepEqual(
      actual.map(({ raw, amount, index, length }) => ({ raw, amount, index, length })),
      fixture.expected.map(({ raw, amount, index, length }) => ({ raw, amount, index, length }))
    );
    fixture.expected.forEach((expected, index) => {
      assert.ok(actual[index]?.evidence.currencyCodes.includes(expected.currency));
    });
  });
}

test("ambiguous symbols retain all catalog candidates", () => {
  const [dollar, yen] = detectPriceCandidates("$12 and ¥300");
  assert.ok(dollar.evidence.currencyCodes.includes("USD"));
  assert.ok(dollar.evidence.currencyCodes.includes("AUD"));
  assert.deepEqual(yen.evidence.currencyCodes, ["JPY", "CNY"]);
});

test("unicode spaces and minus signs are normalized without corrupting ranges", () => {
  const [candidate] = detectPriceCandidates("Pay 1\u202f234,50\u00a0EUR today");
  assert.deepEqual(
    { raw: candidate.raw, amount: candidate.amount, index: candidate.index, length: candidate.length },
    { raw: "1\u202f234,50\u00a0EUR", amount: 1234.5, index: 4, length: 12 }
  );
  assert.deepEqual(detectPriceCandidates("−€25.00"), []);
});

test("ungrouped integers are never partially truncated", () => {
  for (let digits = 4; digits <= 14; digits += 1) {
    const raw = `¥${"1".repeat(digits)}`;
    const [candidate] = detectPriceCandidates(raw);
    assert.equal(candidate.raw, raw);
    assert.equal(candidate.length, raw.length);
    assert.ok(Number.isFinite(candidate.amount));
  }
});
