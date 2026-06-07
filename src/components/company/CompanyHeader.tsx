import type { CompanyMetrics } from "@/types/domain";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { formatDate } from "@/lib/format";

export function CompanyHeader({
  m,
  sourceUrl,
}: {
  m: CompanyMetrics;
  sourceUrl: string;
}) {
  return (
    <header className="border-b border-border/60 pb-6">
      <div className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-primary">
        {m.symbol} <span className="text-muted-foreground">/ {m.symbol}.SR</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
          {m.nameEn}
        </h1>
        {!m.verified && <UnverifiedBadge />}
      </div>
      {m.nameAr && (
        <p dir="rtl" className="mt-1 font-display text-lg text-muted-foreground">
          {m.nameAr}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
        <span>{m.sector ?? ""}</span>
        <span>Listed {formatDate(m.ipoDate)}</span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          Source
        </a>
      </div>
    </header>
  );
}
