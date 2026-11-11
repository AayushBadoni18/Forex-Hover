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

interface Candidate extends PriceCandidate {
  numberStart: number;
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
const CODE_PATTERN = new RegExp(`\\b(?:${CURRENCIES.map(({ code }) => code).join("|")})\\b`, "gu");
const SYMBOL_PATTERN = new RegExp(
  [...new Set(CURRENCIES.flatMap(({ aliases }) => aliases))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|"),
  "gu"
);
const NUMBER_PATTERN = /\d(?:[\d.,'’\u00a0\u202f ]*\d)?/gu;
const MINUS_SIGNS = new Set(["-", "−", "﹣", "－"]);
// "$3k", "$1.5M", "$2.5 billion", "₹5 crore". Single letters must touch the number.
const MULTIPLIER =
  /^(?:([kK])|([mM]|[ \u00a0]?(?:mn|million))|([bB]|[ \u00a0]?(?:bn|billion))|[ \u00a0]?(trillion)|[ \u00a0]?(lakhs?)|[ \u00a0]?(crores?|[cC]r))(?![\p{L}\p{N}])/u;
const MULTIPLIER_VALUES = [1e3, 1e6, 1e9, 1e12, 1e5, 1e7];

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
  const currencies = mergeAdjacent(tokenizeCurrencies(source), source);
  const numbers = tokenizeNumbers(source);
  const candidates: Candidate[] = [];

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
    let end = Math.max(currency.end, number.end);
    // A minus right before the price is a negative amount, unless it follows a number ("$10-$20").
    if (MINUS_SIGNS.has(source[start - 1] ?? "") && !/\d\s*$/.test(source.slice(0, start - 1))) continue;

    let amount = parseLocalizedNumber(number.raw, currency.currencyCodes);
    if (amount === null || amount <= 0) continue;
    const multiplier = position === "prefix" ? MULTIPLIER.exec(source.slice(number.end, number.end + 12)) : null;
    if (multiplier) {
      amount *= MULTIPLIER_VALUES[multiplier.slice(1).findIndex(Boolean)];
      end += multiplier[0].length;
    }

    candidates.push({
      raw: source.slice(start, end),
      amount,
      index: start,
      length: end - start,
      numberStart: number.start,
      evidence: {
        token: currency.raw,
        kind: currency.kind,
        position,
        currencyCodes: currency.currencyCodes
      }
    });
    if (candidates.length === MAX_CANDIDATES) break;
  }

  const nonOverlapping: Candidate[] = [];
  for (const candidate of candidates.sort((a, b) => a.index - b.index || b.length - a.length)) {
    const previous = nonOverlapping.at(-1);
    if (!previous || candidate.index >= previous.index + previous.length) {
      nonOverlapping.push(candidate);
      continue;
    }
    // "$25.00 USD": a symbol and a code around one number are one price, and the code decides.
    const [code, symbol] = candidate.evidence.kind === "code" ? [candidate, previous] : [previous, candidate];
    if (candidate.numberStart !== previous.numberStart || code.evidence.kind !== "code" || symbol.evidence.kind !== "symbol") continue;
    if (!compatible(symbol.evidence.currencyCodes, code.evidence.currencyCodes[0])) continue;
    const end = Math.max(previous.index + previous.length, candidate.index + candidate.length);
    nonOverlapping[nonOverlapping.length - 1] = {
      ...previous,
      amount: Math.max(previous.amount, candidate.amount),
      raw: source.slice(previous.index, end),
      length: end - previous.index,
      evidence: { ...code.evidence, position: previous.evidence.position }
    };
  }
  return nonOverlapping.map(({ numberStart: _, ...candidate }) => candidate);
}

const compatible = (symbolCodes: CurrencyCode[], code: CurrencyCode) => !symbolCodes.length || symbolCodes.includes(code);

/** "USD $20", "$ CAD 20": a code next to a symbol it can mean is one token, and the code decides. */
function mergeAdjacent(tokens: Token[], text: string): Token[] {
  const merged: Token[] = [];
  for (const token of tokens) {
    const previous = merged.at(-1);
    if (previous && token.start < previous.end) continue; // "$" inside "US$"
    const [code, symbol] = token.kind === "code" ? [token, previous] : [previous, token];
    if (
      previous && code?.kind === "code" && symbol?.kind === "symbol" &&
      /^[ \u00a0]?$/.test(text.slice(previous.end, token.start)) &&
      compatible(symbol.currencyCodes, code.currencyCodes[0])
    ) {
      merged[merged.length - 1] = { ...code, start: previous.start, end: token.end, raw: text.slice(previous.start, token.end) };
    } else merged.push(token);
  }
  return merged;
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
    (word.test(token[0]) && /\p{L}/u.test(text[start - 1] ?? "")) ||
    (word.test(token.at(-1) ?? "") && word.test(text[start + token.length] ?? ""))
  );
}

function isWhitespace(value: string): boolean {
  return value.length <= 4 && /^[\s\u00a0\u202f]*$/u.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
