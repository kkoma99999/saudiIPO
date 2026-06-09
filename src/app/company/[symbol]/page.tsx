import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/db/queries";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { PriceVsTasiChart } from "@/components/company/PriceVsTasiChart";
import { DividendHistoryTable } from "@/components/company/DividendHistoryTable";
import { StatTile } from "@/components/shared/StatTile";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { formatSar, formatPercent, formatCount, formatDate, NA } from "@/lib/format";
import { strings } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const detail = await getCompanyDetail(symbol);
  if (!detail) return { title: strings.company.notFound };
  const m = detail.metrics;
  return {
    title: `${m.nameEn} (${m.symbol})`,
    description: `IPO performance and dividend history for ${m.nameEn} on the Saudi Main Market.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const detail = await getCompanyDetail(symbol);
  if (!detail) notFound();

  const m = detail.metrics;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <CompanyHeader m={m} sourceUrl={detail.sourceUrl} />

      {m.dataCaveat && (
        <div className="mt-4 rounded-lg border border-gold/50 bg-gold/10 px-4 py-2.5 text-sm text-accent-foreground">
          Data note: {m.dataCaveat}
        </div>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile
          label={strings.company.offerPrice}
          hint={
            detail.nominalValue
              ? `par ${formatSar(detail.nominalValue)}, premium ${formatSar(detail.premium)}`
              : undefined
          }
        >
          {formatSar(m.offerPrice)}
        </StatTile>
        <StatTile label={strings.company.currentPrice}>{formatSar(m.currentPrice)}</StatTile>
        <StatTile
          label={strings.company.firstDays}
          hint={m.firstDaysDate ? `to ${formatDate(m.firstDaysDate)}` : undefined}
        >
          <ReturnBadge value={m.firstDaysReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={strings.company.priceReturn}>
          <ReturnBadge value={m.priceReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={strings.company.totalReturn}>
          <ReturnBadge value={m.totalReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={strings.company.yieldOnOffer}>
          {m.yieldOnOffer === null ? NA : formatPercent(m.yieldOnOffer, { sign: false })}
        </StatTile>
        <StatTile label={strings.company.cagr}>
          <ReturnBadge value={m.cagr} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={strings.company.vsTasi}>
          <ReturnBadge value={m.alpha} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={strings.company.ipoDate}>
          <span className="text-xl">{formatDate(m.ipoDate)}</span>
        </StatTile>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between border-b border-border/60 pb-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {strings.company.chartTitle}
          </h2>
          <div className="flex items-center gap-4 font-mono text-[0.62rem] uppercase tracking-[0.1em]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--color-chart-1)" }} />
              Company
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--color-chart-2)" }} />
              TASI
            </span>
          </div>
        </div>
        {detail.series.length > 1 ? (
          <PriceVsTasiChart data={detail.series} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{strings.empty.noData}</p>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 border-b border-border/60 pb-2 font-display text-xl font-semibold tracking-tight">
            IPO details
          </h2>
          <dl className="divide-y divide-border/50 text-sm">
            <Row label={strings.company.nominalValue} value={formatSar(detail.nominalValue)} />
            <Row label={strings.company.premium} value={detail.premium ? formatSar(detail.premium) : NA} />
            <Row label="Shares offered" value={formatCount(detail.shares)} />
            <Row label="Proceeds" value={formatSar(detail.proceeds)} />
            <Row label="Oversubscription" value={detail.oversubscription ? `${detail.oversubscription}x` : NA} />
            <Row label="Sector" value={m.sector ?? NA} />
          </dl>
          {detail.actions.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                {strings.company.actions}
              </h3>
              <ul className="space-y-1 font-mono text-xs">
                {detail.actions.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
                    <span className="tnum">{formatDate(a.actionDate)}</span>
                    <span className="text-muted-foreground">{a.kind}</span>
                    <span className="tnum">x{Number(a.factor).toFixed(4)}</span>
                    {a.sourceUrl ? (
                      <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        src
                      </a>
                    ) : (
                      <span className="w-6" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 border-b border-border/60 pb-2 font-display text-xl font-semibold tracking-tight">
            {strings.company.dividends}
          </h2>
          <DividendHistoryTable
            dividends={detail.dividends}
            total={detail.totalDividends}
            count={m.dividendCount}
            yieldOnOffer={detail.dividendYieldOnOffer}
          />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tnum">{value}</dd>
    </div>
  );
}
