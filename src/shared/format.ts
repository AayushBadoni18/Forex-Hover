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

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: currencyFormat.minimumFractionDigits,
    maximumFractionDigits: currencyFormat.maximumFractionDigits
  }).format(amount);
}

/** Amount with the catalog symbol, e.g. "₹1,234.50". Falls back to the code. */
export function formatMoney(amount: number, currency: CurrencyCode, locale?: Intl.LocalesArgument): string {
  const symbol = CURRENCY_BY_CODE[currency]?.symbol ?? currency;
  const spaced = /^[A-Za-z]/.test(symbol) && symbol.length > 1 ? `${symbol} ` : symbol;
  return `${spaced}${formatAmount(amount, currency, locale)}`;
}
