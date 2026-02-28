/**
 * priceDetector.js — Forex Hover Pro
 *
 * A pure, stateless module for detecting currency values in text strings.
 * Supports symbol-based and ISO code-based currency formats,
 * including European-style decimal commas.
 *
 * No DOM dependencies — fully testable in isolation.
 */

// Encapsulated in an IIFE to avoid polluting the global namespace.
window.PriceDetector = (() => {

  /**
   * Currency definitions: each entry maps a symbol/code to an ISO currency code.
   * Order matters: longer/more specific patterns should be checked first.
   */
  const CURRENCY_MAP = {
    // Symbol-based (placed before text codes to avoid ambiguity)
    "₩": "KRW",
    "₹": "INR",
    "£": "GBP",
    "€": "EUR",
    "¥": "JPY",
    "$": "USD", // Fallback — could be CAD, AUD, etc. USD is most common.
    // ISO text codes (word-boundary matched in regex)
    "USD": "USD",
    "EUR": "EUR",
    "GBP": "GBP",
    "JPY": "JPY",
    "INR": "INR",
    "KRW": "KRW",
    "AUD": "AUD",
    "CAD": "CAD",
    "CHF": "CHF",
    "CNY": "CNY",
    "MXN": "MXN",
    "BRL": "BRL",
    "SGD": "SGD",
    "HKD": "HKD",
    "NOK": "NOK",
    "SEK": "SEK",
    "DKK": "DKK",
    "NZD": "NZD",
    "ZAR": "ZAR",
    "AED": "AED",
  };

  /**
   * MASTER REGEX — matches prices in text.
   *
   * Groups:
   *   1: Symbol prefix (e.g. "$", "£", "€")
   *   2: ISO code prefix (e.g. "USD", "EUR") — with trailing space
   *   3: The numeric amount (supports both 1,200.50 and 1.200,50 formats)
   *   4: Symbol suffix (e.g. "€" after number, European style)
   *   5: ISO code suffix (e.g. "EUR" after number)
   *
   * Handles:
   *   - $1,200.50       → US/UK format
   *   - 1.200,50 €      → European format (decimal comma)
   *   - USD 1,200.50    → Code-prefixed
   *   - 1,200.50 USD    → Code-suffixed
   *   - ¥1200           → No decimals (JPY, KRW)
   */
  const PRICE_REGEX = /(?:([$€£₹¥₩])|(USD|EUR|GBP|JPY|INR|KRW|AUD|CAD|CHF|CNY|MXN|BRL|SGD|HKD|NOK|SEK|DKK|NZD|ZAR|AED)\s?)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s?(USD|EUR|GBP|JPY|INR|KRW|AUD|CAD|CHF|CNY|MXN|BRL|SGD|HKD|NOK|SEK|DKK|NZD|ZAR|AED)|([$€£₹¥₩]))?/g;

  /**
   * Detects all price occurrences in a plain text string.
   *
   * @param {string} text - Raw text content from a DOM text node.
   * @returns {Array<{raw: string, amount: number, currency: string, index: number, length: number}>}
   */
  function detect(text) {
    const results = [];
    let match;

    // Reset lastIndex because the regex is stateful (global flag)
    PRICE_REGEX.lastIndex = 0;

    while ((match = PRICE_REGEX.exec(text)) !== null) {
      const [fullMatch, symPrefix, codePrefix, rawNumber, codeSuffix, symSuffix] = match;

      // Determine currency from whichever group matched
      const currencyKey = symPrefix || codePrefix || codeSuffix || symSuffix;
      if (!currencyKey) continue;

      const currency = CURRENCY_MAP[currencyKey.trim()];
      if (!currency) continue;

      // Parse the numeric amount, handling both European and US/UK number formats.
      const amount = parseAmount(rawNumber);
      if (isNaN(amount) || amount <= 0) continue;

      results.push({
        raw: fullMatch,
        amount,
        currency,
        index: match.index,
        length: fullMatch.length,
      });
    }

    return results;
  }

  /**
   * Parses a numeric string that may use either:
   *   - US/UK format:      "1,200.50"  (comma = thousands, dot = decimal)
   *   - European format:   "1.200,50"  (dot = thousands, comma = decimal)
   *
   * Heuristic: if the string ends with a comma followed by 1-2 digits, it's European.
   *
   * @param {string} str - Raw numeric string from regex capture.
   * @returns {number}
   */
  function parseAmount(str) {
    // European format: ends with comma + 1 or 2 digits (e.g. "1.200,50" or "200,5")
    if (/,\d{1,2}$/.test(str) && str.includes(".")) {
      // European: remove dots (thousands separator), replace comma with dot (decimal)
      return parseFloat(str.replace(/\./g, "").replace(",", "."));
    }

    // US/UK format or no separators: remove commas (thousands) — dot is decimal
    return parseFloat(str.replace(/,/g, ""));
  }

  /**
   * Formats a converted amount with appropriate decimal places.
   * JPY and KRW are typically shown without decimals.
   *
   * @param {number} amount
   * @param {string} currency - ISO code
   * @returns {string}
   */
  function formatAmount(amount, currency) {
    const noDecimalCurrencies = ["JPY", "KRW", "CLP", "IDR"];
    const decimals = noDecimalCurrencies.includes(currency) ? 0 : 2;

    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  /**
   * Maps a currency code to its symbol for display purposes.
   * @param {string} code
   * @returns {string}
   */
  function getSymbol(code) {
    const symbols = {
      USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", KRW: "₩",
      AUD: "A$", CAD: "C$", CHF: "Fr", CNY: "¥", MXN: "MX$", BRL: "R$",
      SGD: "S$", HKD: "HK$", NOK: "kr", SEK: "kr", DKK: "kr",
      NZD: "NZ$", ZAR: "R", AED: "د.إ",
    };
    return symbols[code] || code;
  }

  // Public API
  return { detect, parseAmount, formatAmount, getSymbol };

})();
