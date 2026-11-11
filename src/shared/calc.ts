import { isCurrencyCode, type CurrencyCode } from "./currencies.ts";

/**
 * Plain arithmetic for the amount field: "3*49.99", "(120+30)/2", "1,200 × 2".
 * Returns null for anything else. Hand-parsed: extension pages must never eval.
 */
export function calc(input: string): number | null {
  const src = input.replace(/[\s,_']/g, "").replace(/[×x]/gi, "*").replace(/÷/g, "/").replace(/−/g, "-");
  if (!/^[\d.+\-*/()]+$/.test(src)) return null;
  let i = 0;
  function atom(): number {
    if (src[i] === "(") {
      i++;
      const value = sum();
      if (src[i++] !== ")") throw new SyntaxError();
      return value;
    }
    if (src[i] === "-") {
      i++;
      return -atom();
    }
    const match = /^(?:\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (!match) throw new SyntaxError();
    i += match[0].length;
    return Number(match[0]);
  }
  function product(): number {
    let value = atom();
    while (src[i] === "*" || src[i] === "/") value = src[i++] === "*" ? value * atom() : value / atom();
    return value;
  }
  function sum(): number {
    let value = product();
    while (src[i] === "+" || src[i] === "-") value = src[i++] === "+" ? value + product() : value - product();
    return value;
  }
  try {
    const value = sum();
    return i === src.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export interface ConversionQuery {
  amount: number;
  from: CurrencyCode;
  /** Null when the query names only one currency ("100 usd"). */
  to: CurrencyCode | null;
}

/** Address-bar queries: "100 usd to inr", "49.99 eur in gbp", "3*20 usd", "100 usd". */
export function parseQuery(text: string): ConversionQuery | null {
  const match = /^\s*([\d.,\s+\-*/()×÷]*[\d)])\s*([a-z]{3})(?:\s*(?:to|in|->|=)?\s*([a-z]{3}))?\s*$/i.exec(text);
  if (!match) return null;
  const amount = calc(match[1]);
  const from = match[2].toUpperCase();
  const to = match[3]?.toUpperCase();
  if (!amount || amount <= 0 || amount >= 1e15 || !isCurrencyCode(from)) return null;
  if (to && (!isCurrencyCode(to) || to === from)) return null;
  return { amount, from, to: to && isCurrencyCode(to) ? to : null };
}
