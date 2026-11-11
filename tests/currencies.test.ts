import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENCIES,
  CURRENCY_BY_CODE,
  SYMBOL_TO_CODES,
  isCurrencyCode
} from "../src/shared/currencies.ts";
import { formatAmount, formatRate } from "../src/shared/format.ts";

test("currency catalog keys are unique ISO codes", () => {
  const codes = CURRENCIES.map(({ code }) => code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.every((code) => /^[A-Z]{3}$/.test(code)));
  assert.equal(Object.keys(CURRENCY_BY_CODE).length, CURRENCIES.length);
  assert.equal(isCurrencyCode("USD"), true);
  assert.equal(isCurrencyCode("usd"), false);
});

test("symbol aliases retain ambiguity instead of silently choosing a currency", () => {
  assert.deepEqual(SYMBOL_TO_CODES["¥"], ["JPY", "CNY"]);
  assert.deepEqual(SYMBOL_TO_CODES.kr, ["NOK", "SEK", "DKK", "ISK"]);
  assert.ok((SYMBOL_TO_CODES.$?.length ?? 0) > 1);
  assert.deepEqual(SYMBOL_TO_CODES["₹"], ["INR"]);
});

test("amount formatting follows ISO fraction digits", () => {
  assert.equal(formatAmount(1234.5, "USD", "en-US"), "1,234.50");
  assert.equal(formatAmount(1234.5, "JPY", "en-US"), "1,235");
  assert.equal(formatAmount(1234.5, "KRW", "en-US"), "1,235");
  assert.equal(formatAmount(1234.5, "KWD", "en-US"), "1,234.500");
  assert.equal(formatAmount(1234.5, "BHD", "en-US"), "1,234.500");
});

test("extreme amounts and rates stay readable", () => {
  assert.equal(formatAmount(0.0000381, "USD", "en-US"), "0.000038");
  assert.equal(formatAmount(208_750_000_000, "INR", "en-US"), "208.75B");
  assert.equal(formatAmount(0, "USD", "en-US"), "0.00");
  assert.equal(formatRate(25_412.7, 4, "en-US"), "25,413");
  assert.equal(formatRate(0.011893, 4, "en-US"), "0.01189");
  assert.equal(formatRate(84.1, 4, "en-US"), "84.1");
});
