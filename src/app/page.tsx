import { getAllCompanyMetrics, summarizeCohorts } from "@/db/queries";
import { CohortCard } from "@/components/cohort/CohortCard";
import { StatTile } from "@/components/shared/StatTile";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { strings } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default async function Home() {
  const all = await getAllCompanyMetrics();
  const cohorts = summarizeCohorts(all);

  const returns = all.map((c) => c.totalReturn).filter((x): x is number => x !== null);
  const aboveOffer = returns.filter((r) => r > 0).length;
  const unverified = all.filter((c) => !c.verified).length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <section className="max-w-3xl">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-primary">
          {strings.site.tagline}
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {strings.home.heading}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          {strings.home.intro}
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="IPOs tracked">{all.length}</StatTile>
        <StatTile label="Median total return">
          <ReturnBadge value={median(returns)} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label="Above offer" hint={`of ${all.length} with prices`}>
          {aboveOffer}
        </StatTile>
        <StatTile label="Unverified" hint="awaiting source check">
          {unverified}
        </StatTile>
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between border-b border-border/60 pb-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Cohorts by year
          </h2>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
            total return, adjusted
          </span>
        </div>
        {cohorts.length === 0 ? (
          <EmptyState message={strings.empty.noData} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((c) => (
              <CohortCard key={c.year} cohort={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
