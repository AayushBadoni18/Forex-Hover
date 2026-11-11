export interface CurrencyDefinition {
  readonly code: string;
  readonly name: string;
  readonly flag: string;
  readonly symbol: string;
  readonly aliases: readonly string[];
}

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", symbol: "$", aliases: ["US$", "US $", "$"] },
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€", aliases: ["€"] },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", symbol: "£", aliases: ["£"] },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", symbol: "¥", aliases: ["JP¥", "円", "¥"] },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", symbol: "₹", aliases: ["₹", "Rs.", "Rs"] },
  { code: "KRW", name: "Korean Won", flag: "🇰🇷", symbol: "₩", aliases: ["₩"] },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", symbol: "A$", aliases: ["A$", "AU$", "$"] },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", symbol: "C$", aliases: ["C$", "CA$", "$"] },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", symbol: "CHF", aliases: ["Fr"] },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", symbol: "¥", aliases: ["CN¥", "元", "¥"] },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽", symbol: "MX$", aliases: ["MX$", "$"] },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", symbol: "R$", aliases: ["R$"] },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", symbol: "S$", aliases: ["S$", "$"] },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰", symbol: "HK$", aliases: ["HK$", "$"] },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴", symbol: "kr", aliases: ["kr"] },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪", symbol: "kr", aliases: ["kr"] },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰", symbol: "kr", aliases: ["kr"] },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", symbol: "NZ$", aliases: ["NZ$", "$"] },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", symbol: "R", aliases: ["R"] },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", symbol: "د.إ", aliases: ["د.إ"] },
  { code: "PLN", name: "Polish Złoty", flag: "🇵🇱", symbol: "zł", aliases: ["zł"] },
  { code: "CZK", name: "Czech Koruna", flag: "🇨🇿", symbol: "Kč", aliases: ["Kč"] },
  { code: "HUF", name: "Hungarian Forint", flag: "🇭🇺", symbol: "Ft", aliases: ["Ft"] },
  { code: "RON", name: "Romanian Leu", flag: "🇷🇴", symbol: "lei", aliases: ["lei"] },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷", symbol: "₺", aliases: ["₺"] },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", symbol: "฿", aliases: ["฿"] },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾", symbol: "RM", aliases: ["RM"] },
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩", symbol: "Rp", aliases: ["Rp"] },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭", symbol: "₱", aliases: ["₱"] },
  { code: "VND", name: "Vietnamese Dong", flag: "🇻🇳", symbol: "₫", aliases: ["₫"] },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", symbol: "ر.س", aliases: ["ر.س"] },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦", symbol: "ر.ق", aliases: ["ر.ق"] },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼", symbol: "د.ك", aliases: ["د.ك"] },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭", symbol: "د.ب", aliases: ["د.ب"] },
  { code: "ILS", name: "Israeli Shekel", flag: "🇮🇱", symbol: "₪", aliases: ["₪"] },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬", symbol: "E£", aliases: ["E£", "£"] },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦", aliases: ["₦"] },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭", symbol: "GH₵", aliases: ["GH₵", "₵"] },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh", aliases: ["KSh"] },
  { code: "CLP", name: "Chilean Peso", flag: "🇨🇱", symbol: "CL$", aliases: ["CL$", "$"] },
  { code: "COP", name: "Colombian Peso", flag: "🇨🇴", symbol: "COL$", aliases: ["COL$", "$"] },
  { code: "PEN", name: "Peruvian Sol", flag: "🇵🇪", symbol: "S/", aliases: ["S/"] },
  { code: "ARS", name: "Argentine Peso", flag: "🇦🇷", symbol: "AR$", aliases: ["AR$", "$"] },
  { code: "UYU", name: "Uruguayan Peso", flag: "🇺🇾", symbol: "$U", aliases: ["$U", "$"] },
  { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰", symbol: "₨", aliases: ["₨", "Rs.", "Rs"] },
  { code: "BDT", name: "Bangladeshi Taka", flag: "🇧🇩", symbol: "৳", aliases: ["৳"] },
  { code: "LKR", name: "Sri Lankan Rupee", flag: "🇱🇰", symbol: "රු", aliases: ["රු", "Rs.", "Rs"] },
  { code: "NPR", name: "Nepalese Rupee", flag: "🇳🇵", symbol: "रू", aliases: ["रू", "Rs.", "Rs"] },
  { code: "UAH", name: "Ukrainian Hryvnia", flag: "🇺🇦", symbol: "₴", aliases: ["₴"] },
  { code: "TWD", name: "Taiwan Dollar", flag: "🇹🇼", symbol: "NT$", aliases: ["NT$", "$"] },
  { code: "ISK", name: "Icelandic Króna", flag: "🇮🇸", symbol: "kr", aliases: ["kr"] },
  { code: "MAD", name: "Moroccan Dirham", flag: "🇲🇦", symbol: "MAD", aliases: ["Dhs"] },
  { code: "OMR", name: "Omani Rial", flag: "🇴🇲", symbol: "ر.ع.", aliases: ["ر.ع."] },
  { code: "JOD", name: "Jordanian Dinar", flag: "🇯🇴", symbol: "JD", aliases: [] },
  { code: "KZT", name: "Kazakhstani Tenge", flag: "🇰🇿", symbol: "₸", aliases: ["₸"] },
  { code: "GEL", name: "Georgian Lari", flag: "🇬🇪", symbol: "₾", aliases: ["₾"] },
  { code: "RUB", name: "Russian Ruble", flag: "🇷🇺", symbol: "₽", aliases: ["₽"] }
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
