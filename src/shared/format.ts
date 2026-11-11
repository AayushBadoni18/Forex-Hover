import { CURRENCY_BY_CODE, isCurrencyCode, type CurrencyCode } from "./currencies.ts";

export function formatAmount(
  amount: number,
  currency: CurrencyCode,
  locale?: Intl.LocalesArgument
): string {
  if (!Number.isFinite(amount)) throw new RangeError("Amount must be finite");
  if (!isCurrencyCode(currency)) throw new RangeError(`Unsupported currency: ${currency}`);

  const currencyFormat = new Intl.NumberFormat("en", {
    style: "currency",
    currency
  }).resolvedOptions();

  const digits = currencyFormat.maximumFractionDigits ?? 2;
  const size = Math.abs(amount);
  // "$2.5 billion" in rupees would not fit a tooltip row: 208.75B does.
  if (size >= 1e9) return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(amount);
  // A value below the smallest coin (1 ₫ in dollars) keeps two significant digits instead of rounding to zero.
  if (size > 0 && size < 0.5 / 10 ** digits) return new Intl.NumberFormat(locale, { maximumSignificantDigits: 2 }).format(amount);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: currencyFormat.minimumFractionDigits,
    maximumFractionDigits: digits
  }).format(amount);
}

/** An exchange rate to a few significant digits, never in exponent form: 0.01189, 84.1, 25,410. */
export function formatRate(rate: number, digits = 4, locale?: Intl.LocalesArgument): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: Math.max(digits, Math.ceil(Math.log10(rate))) }).format(rate);
}

/** Amount with the catalog symbol, e.g. "₹1,234.50". Falls back to the code. */
export function formatMoney(amount: number, currency: CurrencyCode, locale?: Intl.LocalesArgument): string {
  const symbol = CURRENCY_BY_CODE[currency]?.symbol ?? currency;
  const spaced = /^[A-Za-z]/.test(symbol) && symbol.length > 1 ? `${symbol} ` : symbol;
  return `${spaced}${formatAmount(amount, currency, locale)}`;
}
