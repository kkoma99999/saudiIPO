import Link from "next/link";
import type { CohortSummary } from "@/types/domain";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";

export async function CohortCard({ cohort }: { cohort: CohortSummary }) {
  const { t } = await getI18n();
  const winRate = cohort.count ? cohort.positiveCount / cohort.count : 0;
  return (
    <Link
      href={`/ipos?year=${cohort.year}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded border border-border/70 bg-card transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-2">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight tnum">
          {cohort.year}
        </span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
          {fmt(t.cohort.listings, { n: cohort.count })}
        </span>
      </div>

      <div className="space-y-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
            {t.cohort.medianTotalReturn}
          </span>
          <ReturnBadge value={cohort.medianTotalReturn} />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
            {t.cohort.average}
          </span>
          <ReturnBadge value={cohort.avgTotalReturn} />
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex h-1 overflow-hidden rounded-sm bg-down/20">
          <div
            className="h-full bg-up"
            style={{ width: `${Math.round(winRate * 100)}%` }}
          />
        </div>
        <div className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
          {fmt(t.cohort.aboveOfferCount, { n: cohort.positiveCount, m: cohort.count })}
        </div>
      </div>

      {cohort.best && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
            {t.cohort.best}
          </span>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-xs text-foreground">{cohort.best.nameEn}</span>
            <span className="font-mono text-xs text-up tnum">
              {cohort.best.totalReturn >= 0 ? "+" : ""}
              {(cohort.best.totalReturn * 100).toFixed(0)}%
            </span>
          </span>
        </div>
      )}
    </Link>
  );
}
