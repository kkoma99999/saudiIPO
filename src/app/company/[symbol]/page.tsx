import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/db/queries";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { PriceVsTasiChart } from "@/components/company/PriceVsTasiChart";
import { DividendHistoryTable } from "@/components/company/DividendHistoryTable";
import { StatTile } from "@/components/shared/StatTile";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import {
  formatSar,
  formatSarCompact,
  formatPercent,
  formatCountCompact,
  formatDate,
  NA,
} from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { displayName } from "@/lib/i18n";

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

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <CompanyHeader m={m} sourceUrl={detail.sourceUrl} />

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
        <div className="rounded-lg border border-border/70 bg-card px-5 py-4 shadow-[inset_3px_0_0_0_var(--color-gold)]">
          <div className="text-xs font-medium text-gold">{t.company.firstDays}</div>
          <div className="mt-3 text-2xl leading-none tnum">
            <ReturnBadge value={m.firstDaysReturn} size="lg" showArrow={false} />
          </div>
          {m.firstDaysDate && (
            <div className="mt-2 text-xs text-muted-foreground">to {formatDate(m.firstDaysDate)}</div>
          )}
        </div>
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
        <StatTile label={t.company.ipoDate}>
          <span className="text-xl">{formatDate(m.ipoDate)}</span>
        </StatTile>
      </section>

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

function Row({ label, value, text = false }: { label: string; value: string; text?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-accent/40">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={text ? "text-sm text-foreground" : "tnum text-sm"}>{value}</dd>
    </div>
  );
}
