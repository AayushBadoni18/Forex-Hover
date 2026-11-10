import {
  CURRENCIES,
  SYMBOL_TO_CODES,
  isCurrencyCode,
  type CurrencyCode
} from "./currencies.ts";

export interface CurrencyEvidence {
  token: string;
  kind: "code" | "symbol";
  position: "prefix" | "suffix";
  currencyCodes: CurrencyCode[];
}

export interface PriceCandidate {
  raw: string;
  amount: number;
  index: number;
  length: number;
  evidence: CurrencyEvidence;
}

interface Token {
  start: number;
  end: number;
  raw: string;
  kind: "code" | "symbol";
  currencyCodes: CurrencyCode[];
}

interface NumberToken {
  start: number;
  end: number;
  raw: string;
}

const MAX_TEXT_LENGTH = 20_000;
const MAX_CANDIDATES = 100;
const CODE_PATTERN = new RegExp(`\\b(?:${CURRENCIES.map(({ code }) => code).join("|")})\\b`, "giu");
const SYMBOL_PATTERN = new RegExp(
  [...new Set(CURRENCIES.flatMap(({ aliases }) => aliases))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|"),
  "gu"
);
const NUMBER_PATTERN = /\d(?:[\d.,'’\u00a0\u202f ]*\d)?/gu;
const MINUS_SIGNS = new Set(["-", "−", "﹣", "－"]);

/**
 * Extracts price candidates without guessing ambiguous currencies.
 *
 * A currency token must directly border an amount (whitespace is allowed).
 * Zero and negative values are excluded. A lone separator followed by three
 * digits is treated as grouping, except for a unique three-fraction currency.
 * Input is capped to keep page parsing bounded.
 */
export function detectPriceCandidates(text: string): PriceCandidate[] {
  const source = text.slice(0, MAX_TEXT_LENGTH);
  const currencies = tokenizeCurrencies(source);
  const numbers = tokenizeNumbers(source);
  const candidates: PriceCandidate[] = [];

  for (const currency of currencies) {
    const before = [...numbers]
      .reverse()
      .find((number) => number.end <= currency.start && isWhitespace(source.slice(number.end, currency.start)));
    const after = numbers.find(
      (number) => number.start >= currency.end && isWhitespace(source.slice(currency.end, number.start))
    );
    const number = after ?? before;
    if (!number) continue;

    const position = number === after ? "prefix" : "suffix";
    const start = Math.min(currency.start, number.start);
    const end = Math.max(currency.end, number.end);
    if (MINUS_SIGNS.has(source[start - 1] ?? "")) continue;

    const amount = parseLocalizedNumber(number.raw, currency.currencyCodes);
    if (amount === null || amount <= 0) continue;

    candidates.push({
      raw: source.slice(start, end),
      amount,
      index: start,
      length: end - start,
      evidence: {
        token: currency.raw,
        kind: currency.kind,
        position,
        currencyCodes: currency.currencyCodes
      }
    });
    if (candidates.length === MAX_CANDIDATES) break;
  }

  const nonOverlapping: PriceCandidate[] = [];
  for (const candidate of candidates.sort((a, b) => a.index - b.index || b.length - a.length)) {
    const previous = nonOverlapping.at(-1);
    if (!previous || candidate.index >= previous.index + previous.length) nonOverlapping.push(candidate);
  }
  return nonOverlapping;
}

function tokenizeCurrencies(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(CODE_PATTERN)) {
    const raw = match[0];
    const code = raw.toUpperCase();
    if (isCurrencyCode(code)) {
      tokens.push({ start: match.index, end: match.index + raw.length, raw, kind: "code", currencyCodes: [code] });
    }
  }
  for (const match of text.matchAll(SYMBOL_PATTERN)) {
    const raw = match[0];
    const start = match.index;
    if (!hasTokenBoundary(text, start, raw)) continue;
    tokens.push({
      start,
      end: start + raw.length,
      raw,
      kind: "symbol",
      currencyCodes: [...(SYMBOL_TO_CODES[raw] ?? [])]
    });
  }
  return tokens.sort((a, b) => a.start - b.start || b.raw.length - a.raw.length);
}

function tokenizeNumbers(text: string): NumberToken[] {
  return [...text.matchAll(NUMBER_PATTERN)]
    .filter((match) => (match[0].match(/\d/g)?.length ?? 0) <= 15)
    .map((match) => ({ start: match.index, end: match.index + match[0].length, raw: match[0] }));
}

function parseLocalizedNumber(raw: string, currencies: CurrencyCode[]): number | null {
  const normalized = raw.replace(/[’]/g, "'").replace(/[\u00a0\u202f]/g, " ");
  if (!/^\d[\d.,' ]*\d$|^\d$/.test(normalized)) return null;

  const compact = normalized.replace(/[' ]/g, "");
  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");
  let decimal: "." | "," | null = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimal = lastDot > lastComma ? "." : ",";
  } else {
    const separator = lastDot >= 0 ? "." : lastComma >= 0 ? "," : null;
    if (separator) {
      const parts = compact.split(separator);
      const fractionDigits = parts.at(-1)?.length ?? 0;
      const uniqueFractionDigits = currencies.length === 1 ? getFractionDigits(currencies[0]) : 0;
      if (parts.length === 2 && (fractionDigits <= 2 || (fractionDigits === 3 && uniqueFractionDigits === 3))) {
        decimal = separator;
      } else if (parts.length > 2 && !isValidGrouping(parts)) {
        const integerParts = parts.slice(0, -1);
        if (fractionDigits >= 1 && fractionDigits <= 3 && isValidGrouping(integerParts)) decimal = separator;
      }
    }
  }

  const decimalIndex = decimal ? normalized.lastIndexOf(decimal) : -1;
  const integerPart = decimalIndex >= 0 ? normalized.slice(0, decimalIndex) : normalized;
  const fractionPart = decimalIndex >= 0 ? normalized.slice(decimalIndex + 1) : "";
  if (fractionPart && !/^\d{1,3}$/.test(fractionPart)) return null;

  const groupingChars = [...new Set(integerPart.replace(/\d/g, ""))];
  if (groupingChars.length > 1) return null;
  if (groupingChars.length === 1 && !isValidGrouping(integerPart.split(groupingChars[0]))) return null;

  const integerDigits = integerPart.replace(/\D/g, "");
  const value = Number(fractionPart ? `${integerDigits}.${fractionPart}` : integerDigits);
  return Number.isFinite(value) ? value : null;
}

function isValidGrouping(parts: string[]): boolean {
  if (parts.length < 2 || !parts.every((part) => /^\d+$/.test(part))) return false;
  const western = /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every((part) => part.length === 3);
  const indian =
    parts.length >= 3 &&
    /^\d{1,3}$/.test(parts[0]) &&
    parts.at(-1)?.length === 3 &&
    parts.slice(1, -1).every((part) => part.length === 2);
  return western || indian;
}

function getFractionDigits(currency: CurrencyCode): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

function hasTokenBoundary(text: string, start: number, token: string): boolean {
  const word = /[\p{L}\p{N}]/u;
  return !(
    (word.test(token[0]) && word.test(text[start - 1] ?? "")) ||
    (word.test(token.at(-1) ?? "") && word.test(text[start + token.length] ?? ""))
  );
}

function isWhitespace(value: string): boolean {
  return value.length <= 4 && /^[\s\u00a0\u202f]*$/u.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
