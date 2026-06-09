import type { Locale } from "./config";

export { getDict, dictionaries, strings, type Dict } from "./strings";
export {
  locales,
  defaultLocale,
  isLocale,
  dirFor,
  intlLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./config";

// Pick the English or Arabic company name for the active locale. name_ar may be empty,
// so fall back to the English name.
export function displayName(
  company: { nameEn: string; nameAr: string | null },
  locale: Locale,
): string {
  if (locale === "ar") return company.nameAr || company.nameEn;
  return company.nameEn;
}

// Fill {key} placeholders in a template string, for example fmt("{n} of {m}", {n, m}).
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
