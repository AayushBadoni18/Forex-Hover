import assert from "node:assert/strict";
import test from "node:test";
import { calc, parseQuery } from "../src/shared/calc.ts";

test("amount arithmetic", () => {
  assert.equal(calc("100"), 100);
  assert.equal(calc("1,299.50"), 1299.5);
  assert.equal(calc("3*49.99"), 149.97);
  assert.equal(calc("2 × 10 + 5"), 25);
  assert.equal(calc("(120+30)/2"), 75);
  assert.equal(calc("10-2-3"), 5);
  assert.equal(calc("-5+10"), 5);
  assert.equal(calc(".5*4"), 2);
  for (const bad of ["", "abc", "2+", "(2", "2)", "1/0", "alert(1)", "2**3", "1..2"]) assert.equal(calc(bad), null, bad);
});

test("address-bar queries", () => {
  assert.deepEqual(parseQuery("100 usd to inr"), { amount: 100, from: "USD", to: "INR" });
  assert.deepEqual(parseQuery("49.99 EUR in gbp"), { amount: 49.99, from: "EUR", to: "GBP" });
  assert.deepEqual(parseQuery("1,200usd inr"), { amount: 1200, from: "USD", to: "INR" });
  assert.deepEqual(parseQuery("3*20 usd"), { amount: 60, from: "USD", to: null });
  for (const bad of ["", "usd", "100", "100 xyz", "100 usd to xyz", "100 usd to usd", "0 usd", "100 usd to"]) assert.equal(parseQuery(bad), null, bad);
});
