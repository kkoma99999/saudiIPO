import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/db/queries";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { PriceVsTasiChart } from "@/components/company/PriceVsTasiChart";
import { DividendHistoryTable } from "@/components/company/DividendHistoryTable";
import { StatTile } from "@/components/shared/StatTile";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { RetailOutcomeCard } from "@/components/company/RetailOutcomeCard";
import {
  formatSar,
  formatSarCompact,
  formatPercent,
  formatCount,
  formatCountCompact,
  formatMultiple,
  formatPctValue,
  formatTimes,
  formatDate,
  NA,
} from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { displayName, fmt } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const { locale, t } = await getI18n();
  const detail = await getCompanyDetail(symbol);
  if (!detail) return { title: t.company.notFound };
  const m = detail.metrics;
  const name = displayName(m, locale);
  return {
    title: `${name} (${m.symbol})`,
    description: `IPO performance and dividend history for ${m.nameEn} on the Saudi Main Market.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const { t } = await getI18n();
  const detail = await getCompanyDetail(symbol);
  if (!detail) notFound();

  const m = detail.metrics;
  const alloc = detail.allocation;
  const subscriptionText =
    alloc && alloc.subscriptionStart && alloc.subscriptionEnd
      ? `${formatDate(alloc.subscriptionStart)} ${t.allocation.to} ${formatDate(alloc.subscriptionEnd)}${
          alloc.subscriptionDays ? ` (${fmt(t.allocation.days, { n: alloc.subscriptionDays })})` : ""
        }`
      : NA;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <CompanyHeader m={m} sourceUrl={detail.sourceUrl} />

      {detail.isNewlyListed && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            {t.debut.newlyListed}
          </span>
        </div>
      )}

      {m.dataCaveat && (
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-gold/40 bg-gold/[0.07] px-4 py-3 text-sm text-accent-foreground">
          <span className="mt-0.5 shrink-0 text-xs font-medium text-gold">
            {t.detail.dataNote}
          </span>
          <span className="text-muted-foreground">{m.dataCaveat}</span>
        </div>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile
          label={t.company.offerPrice}
          hint={
            detail.nominalValue
              ? `par ${formatSar(detail.nominalValue)}, premium ${formatSar(detail.premium)}`
              : undefined
          }
        >
          {formatSar(m.offerPrice)}
        </StatTile>
        <StatTile label={t.company.currentPrice}>{formatSar(m.currentPrice)}</StatTile>
        <StatTile
          label={t.company.firstDays}
          accent
          hint={m.firstDaysDate ? `to ${formatDate(m.firstDaysDate)}` : undefined}
        >
          <ReturnBadge value={m.firstDaysReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={t.company.priceReturn}>
          <ReturnBadge value={m.priceReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={t.company.totalReturn}>
          <ReturnBadge value={m.totalReturn} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={t.company.yieldOnOffer}>
          {m.yieldOnOffer === null ? NA : formatPercent(m.yieldOnOffer, { sign: false })}
        </StatTile>
        <StatTile label={t.company.cagr}>
          <ReturnBadge value={m.cagr} size="lg" showArrow={false} />
        </StatTile>
        <StatTile label={t.company.vsTasi}>
          <ReturnBadge value={m.alpha} size="lg" showArrow={false} />
        </StatTile>
        {detail.peak && (
          <StatTile
            label={t.debut.fromPeak}
            hint={`${formatSar(detail.peak.close)} · ${formatDate(detail.peak.date)}`}
          >
            <ReturnBadge value={detail.peak.drawdown} size="lg" showArrow={false} />
          </StatTile>
        )}
        <StatTile label={t.company.ipoDate}>
          <span className="text-xl">{formatDate(m.ipoDate)}</span>
        </StatTile>
      </section>

      <section className="mt-8">
        <RetailOutcomeCard
          outcome={detail.retailOutcome}
          verified={alloc?.verified ?? false}
          sourceUrl={alloc?.sourceUrl ?? null}
        />
      </section>

      {detail.debut && (
        <section className="mt-8">
          <h2 className="mb-4 flex items-baseline gap-2 text-sm font-semibold tracking-tight text-foreground">
            {t.debut.title}
            <span className="text-xs font-normal text-muted-foreground tnum">
              {formatDate(detail.debut.date)}
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label={t.debut.return} hint={t.debut.returnHint}>
              <ReturnBadge value={detail.debut.return} size="lg" showArrow={false} />
            </StatTile>
            <StatTile label={t.debut.range} hint={t.debut.rangeHint}>
              {detail.debut.rangePct === null
                ? NA
                : formatPercent(detail.debut.rangePct, { sign: false })}
            </StatTile>
            <StatTile label={t.debut.turnover}>
              {formatSarCompact(detail.debut.turnover)}
            </StatTile>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between border-b border-border/70 pb-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {t.company.chartTitle}
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--color-chart-1)" }} />
              {t.detail.legendCompany}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--color-chart-2)" }} />
              {t.detail.legendTasi}
            </span>
          </div>
        </div>
        {detail.series.length > 1 ? (
          <PriceVsTasiChart data={detail.series} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{t.empty.noData}</p>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 border-b border-border/70 pb-3 text-sm font-semibold tracking-tight text-foreground">
            {t.detail.ipoDetails}
          </h2>
          <dl className="overflow-hidden rounded-lg border border-border/70 bg-card text-sm">
            <Row label={t.company.nominalValue} value={formatSar(detail.nominalValue)} />
            <Row label={t.company.premium} value={detail.premium ? formatSar(detail.premium) : NA} />
            <Row label={t.detail.sharesOffered} value={formatCountCompact(detail.shares)} />
            <Row label={t.detail.proceeds} value={formatSarCompact(detail.proceeds)} />
            <Row label={t.detail.oversubscription} value={detail.oversubscription ? `${detail.oversubscription}x` : NA} />
            <Row label={t.company.sector} value={m.sector ?? NA} text />
          </dl>

          {detail.valuation && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border/70 bg-card">
              <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-2.5">
                <h3 className="text-xs font-medium text-muted-foreground">{t.valuation.title}</h3>
                {detail.valuation.sourceUrl && (
                  <a
                    href={detail.valuation.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {t.detail.source}
                  </a>
                )}
              </div>
              <dl className="text-sm">
                <Row
                  label={t.valuation.peRecurring}
                  value={formatMultiple(detail.valuation.peRecurringTtm)}
                  hint={
                    detail.valuation.recurringEpsTtm
                      ? `${t.valuation.eps} ${formatSar(detail.valuation.recurringEpsTtm)}`
                      : undefined
                  }
                />
                <Row
                  label={t.valuation.priceToBook}
                  value={formatMultiple(detail.valuation.priceToBook)}
                  hint={
                    detail.valuation.bookValuePerShare
                      ? `${t.valuation.book} ${formatSar(detail.valuation.bookValuePerShare)}`
                      : undefined
                  }
                />
              </dl>
              <p className="border-t border-border/50 px-4 py-2.5 text-xs text-muted-foreground">
                {t.valuation.note}
              </p>
            </div>
          )}

          {alloc && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border/70 bg-card">
              <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-2.5">
                <h3 className="text-xs font-medium text-muted-foreground">
                  {t.allocation.detailsTitle}
                </h3>
                {alloc.sourceUrl && (
                  <a
                    href={alloc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {t.detail.source}
                  </a>
                )}
              </div>
              <dl className="text-sm">
                <Row label={t.allocation.retailTranche} value={formatPctValue(alloc.retailTranchePct)} />
                <Row label={t.allocation.retailShares} value={formatCountCompact(alloc.retailSharesOffered)} />
                <Row
                  label={t.allocation.minAllocation}
                  value={
                    alloc.minAllocationShares
                      ? `${formatCount(alloc.minAllocationShares)} ${t.allocation.shares}`
                      : NA
                  }
                />
                <Row label={t.allocation.retailCoverage} value={formatTimes(alloc.retailCoverageMultiple)} />
                <Row label={t.allocation.institutionalCoverage} value={formatTimes(alloc.institutionalCoverageMultiple)} />
                <Row label={t.allocation.factor} value={formatPctValue(alloc.allocationFactor, 3)} />
                <Row label={t.allocation.subscribers} value={formatCount(alloc.individualSubscribersCount)} />
                <Row label={t.allocation.period} value={subscriptionText} text />
              </dl>
              {alloc.advisors.length > 0 && (
                <div className="border-t border-border/50">
                  <h4 className="px-4 pt-3 text-xs font-medium text-muted-foreground">
                    {t.allocation.advisors}
                  </h4>
                  <ul className="px-4 pb-3 pt-2 text-xs">
                    {alloc.advisors.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-1">
                        <span className="text-foreground">{a.name}</span>
                        <span className="text-muted-foreground">
                          {t.role[a.role as keyof typeof t.role] ?? a.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {detail.actions.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border/70 bg-card">
              <h3 className="border-b border-border/70 bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                {t.company.actions}
              </h3>
              <ul className="text-xs">
                {detail.actions.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5 transition-colors last:border-0 hover:bg-accent/40">
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
          <h2 className="mb-4 border-b border-border/70 pb-3 text-sm font-semibold tracking-tight text-foreground">
            {t.company.dividends}
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

function Row({
  label,
  value,
  text = false,
  hint,
}: {
  label: string;
  value: string;
  text?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-accent/40">
      <dt className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="ms-2 text-xs text-muted-foreground/70 tnum">{hint}</span>}
      </dt>
      <dd className={text ? "text-sm text-foreground" : "tnum text-sm"}>{value}</dd>
    </div>
  );
}
