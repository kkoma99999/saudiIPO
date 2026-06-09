"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

// EN / ع toggle. Writes the locale cookie and refreshes the server tree, which re-reads
// the cookie and re-renders every page, header, and the html lang/dir in the new
// language. No page reload, no URL change.
export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const base =
    "px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-colors";
  const on = "text-primary";
  const off = "text-muted-foreground hover:text-foreground";

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t.switcher.label}>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-pressed={locale === "en"}
        className={`${base} ${locale === "en" ? on : off}`}
      >
        {t.switcher.english}
      </button>
      <span aria-hidden className="text-border">
        /
      </span>
      <button
        type="button"
        onClick={() => choose("ar")}
        aria-pressed={locale === "ar"}
        className={`${base} text-sm ${locale === "ar" ? on : off}`}
      >
        {t.switcher.arabic}
      </button>
    </div>
  );
}
