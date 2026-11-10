export interface CurrencyDefinition {
  readonly code: string;
  readonly name: string;
  readonly flag: string;
  readonly symbol: string;
  readonly aliases: readonly string[];
  readonly providerCode: string;
}

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", symbol: "$", aliases: ["US$", "$"], providerCode: "USD" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€", aliases: ["€"], providerCode: "EUR" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", symbol: "£", aliases: ["£"], providerCode: "GBP" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥", aliases: ["JP¥", "¥"], providerCode: "JPY" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", symbol: "₹", aliases: ["₹"], providerCode: "INR" },
  { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩", aliases: ["₩"], providerCode: "KRW" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", symbol: "A$", aliases: ["A$", "AU$", "$"], providerCode: "AUD" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", symbol: "C$", aliases: ["C$", "CA$", "$"], providerCode: "CAD" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", symbol: "CHF", aliases: ["Fr"], providerCode: "CHF" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", symbol: "¥", aliases: ["CN¥", "元", "¥"], providerCode: "CNY" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽", symbol: "MX$", aliases: ["MX$", "$"], providerCode: "MXN" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", symbol: "R$", aliases: ["R$"], providerCode: "BRL" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", symbol: "S$", aliases: ["S$", "$"], providerCode: "SGD" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰", symbol: "HK$", aliases: ["HK$", "$"], providerCode: "HKD" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴", symbol: "kr", aliases: ["kr"], providerCode: "NOK" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪", symbol: "kr", aliases: ["kr"], providerCode: "SEK" },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰", symbol: "kr", aliases: ["kr"], providerCode: "DKK" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", symbol: "NZ$", aliases: ["NZ$", "$"], providerCode: "NZD" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", symbol: "R", aliases: ["R"], providerCode: "ZAR" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", symbol: "د.إ", aliases: ["د.إ"], providerCode: "AED" },
  { code: "PLN", name: "Polish Złoty", flag: "🇵🇱", symbol: "zł", aliases: ["zł"], providerCode: "PLN" },
  { code: "CZK", name: "Czech Koruna", flag: "🇨🇿", symbol: "Kč", aliases: ["Kč"], providerCode: "CZK" },
  { code: "HUF", name: "Hungarian Forint", flag: "🇭🇺", symbol: "Ft", aliases: ["Ft"], providerCode: "HUF" },
  { code: "RON", name: "Romanian Leu", flag: "🇷🇴", symbol: "lei", aliases: ["lei"], providerCode: "RON" },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷", symbol: "₺", aliases: ["₺"], providerCode: "TRY" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", symbol: "฿", aliases: ["฿"], providerCode: "THB" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾", symbol: "RM", aliases: ["RM"], providerCode: "MYR" },
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩", symbol: "Rp", aliases: ["Rp"], providerCode: "IDR" },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭", symbol: "₱", aliases: ["₱"], providerCode: "PHP" },
  { code: "VND", name: "Vietnamese Dong", flag: "🇻🇳", symbol: "₫", aliases: ["₫"], providerCode: "VND" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", symbol: "ر.س", aliases: ["ر.س"], providerCode: "SAR" },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦", symbol: "ر.ق", aliases: ["ر.ق"], providerCode: "QAR" },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼", symbol: "د.ك", aliases: ["د.ك"], providerCode: "KWD" },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭", symbol: "د.ب", aliases: ["د.ب"], providerCode: "BHD" },
  { code: "ILS", name: "Israeli Shekel", flag: "🇮🇱", symbol: "₪", aliases: ["₪"], providerCode: "ILS" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬", symbol: "E£", aliases: ["E£", "£"], providerCode: "EGP" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦", aliases: ["₦"], providerCode: "NGN" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭", symbol: "GH₵", aliases: ["GH₵", "₵"], providerCode: "GHS" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh", aliases: ["KSh"], providerCode: "KES" },
  { code: "CLP", name: "Chilean Peso", flag: "🇨🇱", symbol: "CL$", aliases: ["CL$", "$"], providerCode: "CLP" },
  { code: "COP", name: "Colombian Peso", flag: "🇨🇴", symbol: "COL$", aliases: ["COL$", "$"], providerCode: "COP" },
  { code: "PEN", name: "Peruvian Sol", flag: "🇵🇪", symbol: "S/", aliases: ["S/"], providerCode: "PEN" },
  { code: "ARS", name: "Argentine Peso", flag: "🇦🇷", symbol: "AR$", aliases: ["AR$", "$"], providerCode: "ARS" },
  { code: "UYU", name: "Uruguayan Peso", flag: "🇺🇾", symbol: "$U", aliases: ["$U", "$"], providerCode: "UYU" },
  { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰", symbol: "₨", aliases: ["₨"], providerCode: "PKR" },
  { code: "BDT", name: "Bangladeshi Taka", flag: "🇧🇩", symbol: "৳", aliases: ["৳"], providerCode: "BDT" },
  { code: "LKR", name: "Sri Lankan Rupee", flag: "🇱🇰", symbol: "රු", aliases: ["රු", "Rs"], providerCode: "LKR" },
  { code: "NPR", name: "Nepalese Rupee", flag: "🇳🇵", symbol: "रू", aliases: ["रू"], providerCode: "NPR" },
  { code: "UAH", name: "Ukrainian Hryvnia", flag: "🇺🇦", symbol: "₴", aliases: ["₴"], providerCode: "UAH" },
  { code: "RUB", name: "Russian Ruble", flag: "🇷🇺", symbol: "₽", aliases: ["₽"], providerCode: "RUB" }
] as const satisfies readonly CurrencyDefinition[];

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_CODES = CURRENCIES.map(({ code }) => code) as CurrencyCode[];

export const CURRENCY_BY_CODE = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency])
) as Record<CurrencyCode, (typeof CURRENCIES)[number]>;

export const SYMBOL_TO_CODES = CURRENCIES.reduce<Record<string, CurrencyCode[]>>(
  (index, currency) => {
    for (const alias of currency.aliases) (index[alias] ??= []).push(currency.code);
    return index;
  },
  {}
);

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && Object.hasOwn(CURRENCY_BY_CODE, value);
}

/** Lower-case flag region for a currency ("us", "eu", "in"), read from its flag emoji. */
export function flagRegion(code: CurrencyCode): string {
  return [...CURRENCY_BY_CODE[code].flag]
    .map((c) => String.fromCharCode(c.codePointAt(0)! - 0x1f1e6 + 97))
    .join("");
}
