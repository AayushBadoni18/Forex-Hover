import assert from "node:assert/strict";
import test from "node:test";
import {
  currencyForLocale,
  isSiteListed,
  normalizeDomain,
  resolveCurrency
} from "../src/shared/currency-resolver.ts";
import { detectPriceCandidates } from "../src/shared/price-parser.ts";

const candidate = (text: string) => {
  const [value] = detectPriceCandidates(text);
  assert.ok(value);
  return value;
};

test("explicit ISO evidence outranks every contextual hint", () => {
  assert.deepEqual(
    resolveCurrency(candidate("USD 10"), {
      hostname: "shop.example.ca",
      language: "en-CA",
      defaultCurrency: "AUD",
      domainOverrides: { "example.ca": "CAD" }
    }),
    { currency: "USD", confidence: "certain", reason: "explicit-code" }
  );
});

test("the longest matching domain override wins across subdomains", () => {
  assert.deepEqual(
    resolveCurrency(candidate("$10"), {
      hostname: "store.shop.amazon.ca",
      defaultCurrency: "USD",
      domainOverrides: { "amazon.ca": "CAD", "shop.amazon.ca": "AUD" }
    }),
    { currency: "AUD", confidence: "high", reason: "domain-override" }
  );
});

test("unique symbols, locale, hostname, and user default follow documented precedence", () => {
  assert.deepEqual(resolveCurrency(candidate("€10"), {}), {
    currency: "EUR",
    confidence: "certain",
    reason: "unique-symbol"
  });
  assert.deepEqual(resolveCurrency(candidate("$10"), { language: "en-CA" }), {
    currency: "CAD",
    confidence: "medium",
    reason: "document-region"
  });
  assert.deepEqual(resolveCurrency(candidate("$10"), { hostname: "store.example.com.au" }), {
    currency: "AUD",
    confidence: "medium",
    reason: "hostname-region"
  });
  assert.deepEqual(resolveCurrency(candidate("$10"), { defaultCurrency: "USD" }), {
    currency: "USD",
    confidence: "low",
    reason: "user-default"
  });
});

test("invalid and public-suffix-like override keys are ignored", () => {
  assert.equal(normalizeDomain("https://example.com/path"), null);
  assert.equal(normalizeDomain("co.uk"), null);
  assert.equal(normalizeDomain("amazon.co.uk"), "amazon.co.uk");
  assert.deepEqual(
    resolveCurrency(candidate("£10"), {
      hostname: "shop.co.uk",
      defaultCurrency: "EGP",
      domainOverrides: { "co.uk": "GBP" }
    }),
    // The invalid "co.uk" rule is ignored; the .uk hostname still identifies GBP.
    { currency: "GBP", confidence: "medium", reason: "hostname-region" }
  );
});

test("a locale maps to its region's currency for the first-run home currency", () => {
  assert.equal(currencyForLocale("en-IN"), "INR");
  assert.equal(currencyForLocale("de"), "EUR");
  assert.equal(currencyForLocale("en-GB"), "GBP");
  assert.equal(currencyForLocale("ja"), "JPY");
  assert.equal(currencyForLocale("not a locale"), null);
  assert.equal(currencyForLocale(undefined), null);
});

test("paused sites cover the site and its subdomains only", () => {
  assert.equal(isSiteListed("www.amazon.in", ["amazon.in"]), true);
  assert.equal(isSiteListed("smile.amazon.in", ["amazon.in"]), true);
  assert.equal(isSiteListed("notamazon.in", ["amazon.in"]), false);
  assert.equal(isSiteListed("amazon.in", ["", 5, null]), false);
  assert.equal(isSiteListed("amazon.in", undefined), false);
});
