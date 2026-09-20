import type { CurrencyCode } from "../../src/shared/currencies.ts";

export interface ExpectedPrice {
  raw: string;
  amount: number;
  currency: CurrencyCode;
  index: number;
  length: number;
}

export interface PriceFixture {
  name: string;
  text: string;
  expected: ExpectedPrice[];
  legacyFails?: string;
}

const price = (raw: string, amount: number, currency: CurrencyCode, index = 0): ExpectedPrice => ({
  raw,
  amount,
  currency,
  index,
  length: raw.length
});

export const PRICE_FIXTURES: PriceFixture[] = [
  { name: "US grouped amount", text: "$1,200.50", expected: [price("$1,200.50", 1200.5, "USD")] },
  { name: "simple euro amount", text: "€19.99", expected: [price("€19.99", 19.99, "EUR")] },
  { name: "prefix ISO code", text: "USD 42", expected: [price("USD 42", 42, "USD")] },
  { name: "grouped zero-decimal currency", text: "KRW 12,000", expected: [price("KRW 12,000", 12000, "KRW")] },
  { name: "currency prose", text: "USD is strong today", expected: [] },
  { name: "zero is not a purchasable price", text: "$0.00", expected: [] },
  {
    name: "suffix euro symbol",
    text: "1.200,50 €",
    expected: [price("1.200,50 €", 1200.5, "EUR")],
    legacyFails: "suffix-only prices are unreachable"
  },
  {
    name: "suffix ISO code",
    text: "99.95 USD",
    expected: [price("99.95 USD", 99.95, "USD")],
    legacyFails: "suffix-only prices are unreachable"
  },
  {
    name: "suffix ISO code with decimal comma",
    text: "19,99 EUR",
    expected: [price("19,99 EUR", 19.99, "EUR")],
    legacyFails: "suffix-only prices are unreachable"
  },
  {
    name: "Indian grouping",
    text: "₹1,23,456.78",
    expected: [price("₹1,23,456.78", 123456.78, "INR")],
    legacyFails: "Indian grouping is split"
  },
  {
    name: "multi-character Australian symbol",
    text: "A$120.00",
    expected: [price("A$120.00", 120, "AUD")],
    legacyFails: "only the dollar suffix is consumed"
  },
  {
    name: "multi-character Brazilian symbol",
    text: "R$ 99,90",
    expected: [price("R$ 99,90", 99.9, "BRL")],
    legacyFails: "only the dollar suffix is consumed"
  },
  {
    name: "apostrophe grouping",
    text: "CHF 1'234.50",
    expected: [price("CHF 1'234.50", 1234.5, "CHF")],
    legacyFails: "apostrophe grouping is truncated"
  },
  {
    name: "ungrouped four-digit amount",
    text: "¥1200",
    expected: [price("¥1200", 1200, "JPY")],
    legacyFails: "the short numeric branch wins"
  },
  {
    name: "negative amount",
    text: "-$5.00",
    expected: [],
    legacyFails: "the minus sign is discarded"
  },
  {
    name: "long ungrouped amount",
    text: "$123456789.12",
    expected: [price("$123456789.12", 123456789.12, "USD")],
    legacyFails: "the short numeric branch wins"
  }
];
