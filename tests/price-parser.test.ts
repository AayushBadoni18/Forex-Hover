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

test("real-world price shapes", () => {
  // [text, [amount, currencies the evidence must be exactly, raw]...]
  const cases: [string, ...[number, string, string][]][] = [
    ["$25.00 USD", [25, "USD", "$25.00 USD"]],
    ["$20 CAD", [20, "CAD", "$20 CAD"]],
    ["USD $20", [20, "USD", "USD $20"]],
    ["US $20", [20, "USD", "US $20"]],
    ["€20 USD", [20, "EUR", "€20"]],
    ["$10-$20", [10, "", "$10"], [20, "", "$20"]],
    ["-$5"],
    ["Try 30 days free"],
    ["Rs. 500", [500, "INR/PKR/LKR/NPR", "Rs. 500"]],
    ["$3k", [3000, "", "$3k"]],
    ["$1.5M", [1_500_000, "", "$1.5M"]],
    ["$2.5 billion", [2_500_000_000, "", "$2.5 billion"]],
    ["₹5 crore", [50_000_000, "INR", "₹5 crore"]],
    ["$5 m", [5, "", "$5"]],
    ["$1.5Mbps", [1.5, "", "$1.5"]],
    ["1000円", [1000, "JPY", "1000円"]],
    ["99kr", [99, "NOK/SEK/DKK/ISK", "99kr"]],
    ["NT$300", [300, "TWD", "NT$300"]],
    ["R5 5600"]
  ];
  for (const [text, ...expected] of cases) {
    const actual = detectPriceCandidates(text);
    assert.equal(actual.length, expected.length, text);
    expected.forEach(([amount, codes, raw], i) => {
      assert.equal(actual[i].amount, amount, text);
      assert.equal(actual[i].raw, raw, text);
      if (codes) assert.equal(actual[i].evidence.currencyCodes.join("/"), codes, text);
    });
  }
});
