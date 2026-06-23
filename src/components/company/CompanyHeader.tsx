import type { CompanyMetrics } from "@/types/domain";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { displayName } from "@/lib/i18n";
import { isArgaamUrl } from "@/lib/source";

export async function CompanyHeader({
  m,
  sourceUrl,
}: {
  m: CompanyMetrics;
  sourceUrl: string;
}) {
  const { locale, t } = await getI18n();
  // Show the other-language name underneath the heading when it differs. In English the
  // Arabic name reads right to left; in Arabic the English name reads left to right.
  const secondaryName = locale === "en" ? m.nameAr : m.nameEn;
  const secondaryDir = locale === "en" ? "rtl" : "ltr";
  const showSecondary = Boolean(secondaryName) && secondaryName !== displayName(m, locale);

  return (
    <header className="border-b border-border/60 pb-6">
      <div className="flex items-start gap-4">
        <CompanyLogo symbol={m.symbol} name={m.nameEn} size={60} />
        <div className="min-w-0">
          <div className="font-mono text-xs text-primary tnum">
            {m.symbol} <span className="text-muted-foreground">/ {m.symbol}.SR</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
              {displayName(m, locale)}
            </h1>
            {!m.verified && <UnverifiedBadge />}
          </div>
          {showSecondary && (
            <p dir={secondaryDir} className="mt-1 font-display text-lg text-muted-foreground">
              {secondaryName}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>{m.sector ?? ""}</span>
        <span>
          {t.detail.listed} {formatDate(m.ipoDate)}
        </span>
        {!isArgaamUrl(sourceUrl) && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {t.detail.source}
          </a>
        )}
      </div>
    </header>
  );
}
