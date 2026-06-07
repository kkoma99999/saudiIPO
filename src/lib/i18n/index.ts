import { locale } from "./config";
import { strings } from "./strings";

export { strings } from "./strings";
export { locale, dir, intlLocale } from "./config";

// Pick the English or Arabic name based on the active locale. name_ar may be empty,
// so fall back to the English name.
export function displayName(company: {
  nameEn: string;
  nameAr: string | null;
}): string {
  if (locale === "en") return company.nameEn;
  return company.nameAr || company.nameEn;
}

// Minimal lookup helper. Kept simple now; becomes locale-aware later.
export function t(getter: (s: typeof strings) => string): string {
  return getter(strings);
}
