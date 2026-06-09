// i18n configuration. Two locales: English (ltr) and Arabic (rtl). The active locale
// is chosen per request from the NEXT_LOCALE cookie (see ./server). Financial figures
// keep Western digits in both languages, so number and date formatting stays on en-SA
// regardless of the UI language.

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

// Number, money, and date formatting locale. Kept on en-SA for both languages so
// prices and dates show Western digits, the convention on Saudi financial screens.
export const intlLocale = "en-SA";
