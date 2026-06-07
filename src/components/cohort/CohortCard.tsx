import Link from "next/link";
import type { CohortSummary } from "@/types/domain";
import { ReturnBadge } from "@/components/shared/ReturnBadge";

export function CohortCard({ cohort }: { cohort: CohortSummary }) {
  const winRate = cohort.count ? cohort.positiveCount / cohort.count : 0;
  return (
    <Link
      href={`/ipos?year=${cohort.year}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_1px_0_0_var(--color-gold)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl font-semibold leading-none tracking-tight">
          {cohort.year}
        </span>
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted-foreground">
          {cohort.count} {cohort.count === 1 ? "listing" : "listings"}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
            Median total return
          </span>
          <ReturnBadge value={cohort.medianTotalReturn} />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
            Average
          </span>
          <ReturnBadge value={cohort.avgTotalReturn} />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-down/20">
          <div
            className="h-full bg-up"
            style={{ width: `${Math.round(winRate * 100)}%` }}
          />
        </div>
        <div className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
          {cohort.positiveCount} of {cohort.count} above offer
        </div>
      </div>

      {cohort.best && (
        <div className="mt-5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          Best:{" "}
          <span className="text-foreground">{cohort.best.nameEn}</span>{" "}
          <span className="text-up tnum">
            {cohort.best.totalReturn >= 0 ? "+" : ""}
            {(cohort.best.totalReturn * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </Link>
  );
}
