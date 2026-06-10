import { getAllCompanyMetrics, summarizeCohorts } from "@/db/queries";
import { CohortCard } from "@/components/cohort/CohortCard";
import { StatTile } from "@/components/shared/StatTile";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default async function Home() {
  const { locale, t } = await getI18n();
  const all = await getAllCompanyMetrics();
  const cohorts = summarizeCohorts(all);

  const returns = all.map((c) => c.totalReturn).filter((x): x is number => x !== null);
  const aboveOffer = returns.filter((r) => r > 0).length;
  const unverified = all.filter((c) => !c.verified).length;

  const titleWords = t.site.title.split(" ");
  const titleLead = titleWords.slice(0, -1).join(" ");
  const titleLast = titleWords[titleWords.length - 1];

  return (
    <div className="relative mx-auto max-w-6xl px-5 py-12">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute end-5 top-6 hidden select-none text-[9rem] font-semibold leading-none tracking-tighter text-foreground/[0.03] tnum lg:block"
      >
        TASI
      </span>
      <section className="rise max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {t.site.tagline}
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
          {locale === "en" ? (
            <>
              Saudi IPO <span className="text-primary">Terminal</span>
            </>
          ) : (
            <>
              {titleLead} <span className="text-primary">{titleLast}</span>
            </>
          )}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t.home.intro}
        </p>
      </section>

      <section className="rise rise-2 mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label={t.home.iposTracked}>{all.length}</StatTile>
        <StatTile label={t.home.medianTotalReturn}>
          <ReturnBadge value={median(returns)} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={t.home.aboveOffer} hint={fmt(t.home.withPrices, { n: all.length })}>
          {aboveOffer}
        </StatTile>
        <StatTile label={t.home.unverified} hint={t.home.awaitingSource}>
          {unverified}
        </StatTile>
      </section>

      <section className="rise rise-3 mt-14">
        <div className="mb-5 flex items-end justify-between border-b border-border/60 pb-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {t.home.cohortsByYear}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t.home.totalReturnAdjusted}
          </span>
        </div>
        {cohorts.length === 0 ? (
          <EmptyState message={t.empty.noData} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((c) => (
              <CohortCard key={c.year} cohort={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
