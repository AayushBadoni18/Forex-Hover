import { isCurrencyCode, type CurrencyCode } from "./currencies.ts";

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
