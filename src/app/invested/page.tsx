import type { Metadata } from "next";
import Link from "next/link";
import { getInvestmentOutcomes } from "@/db/queries";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { getI18n } from "@/lib/i18n/server";
import { displayName, fmt } from "@/lib/i18n";
import { formatCount, formatSarWhole, ipoYear } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "10,000 SAR into each IPO",
  description:
    "What 10,000 SAR subscribed to each Saudi Main Market IPO would be worth today, on the shares actually allotted after the minimum allocation and the allocation factor.",
};

export default async function InvestedPage() {
  const { locale, t } = await getI18n();
  const outcomes = await getInvestmentOutcomes();
  const ranked = outcomes.filter((o) => o.netProfit !== null);
  const unranked = outcomes.filter((o) => o.netProfit === null && !o.hasFactor);
  const topProfit = ranked.length ? (ranked[0].netProfit as number) : 0;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <section className="rise max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          {t.invested.kicker}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          {t.invested.heading}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">{t.invested.intro}</p>
      </section>

      <section className="rise rise-2 mt-12">
        <div className="mb-4 flex items-end justify-between border-b border-border/60 pb-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">{t.invested.heading}</h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t.invested.nowWorth}</span>
        </div>

        {ranked.length === 0 ? (
          <EmptyState message={t.empty.noData} />
        ) : (
          <ol className="space-y-2">
            {ranked.map((o, i) => {
              const profit = o.netProfit as number;
              const gain = profit >= 0;
              const barPct =
                topProfit > 0 ? Math.max(0, Math.round((profit / topProfit) * 100)) : 0;
              return (
                <li key={o.symbol}>
                  <Link
                    href={`/company/${o.symbol}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border/70 bg-card px-3 py-3 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 sm:gap-4 sm:px-4"
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-sm font-semibold tabular-nums tnum text-muted-foreground sm:w-6">
                      {i + 1}
                    </span>
                    <CompanyLogo symbol={o.symbol} name={o.nameEn} size={32} />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-medium text-foreground"
                        title={displayName(o, locale)}
                      >
                        {displayName(o, locale)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {fmt(t.invested.listedIn, { year: ipoYear(o.ipoDate) })}
                        {" · "}
                        {fmt(t.invested.allotment, {
                          shares: formatCount(o.allottedShares),
                          deployed: formatSarWhole(o.capitalDeployed),
                        })}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-base font-semibold tabular-nums tnum text-foreground sm:text-lg">
                        {formatSarWhole(o.currentValue)}
                      </div>
                      <div className="mt-0.5 flex items-center justify-end gap-2">
                        <span
                          className={`font-mono text-xs tabular-nums tnum ${gain ? "text-up" : "text-down"}`}
                        >
                          {gain ? "+" : ""}
                          {formatSarWhole(profit)}
                        </span>
                        <ReturnBadge value={o.returnPct} showArrow={false} />
                      </div>
                    </div>
                    {barPct > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-border/40"
                      >
                        <span
                          className="growx block h-full bg-primary/45"
                          style={{ width: `${barPct}%` }}
                        />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {unranked.length > 0 && (
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {fmt(t.invested.unranked, { n: unranked.length })}:{" "}
            {unranked.map((o) => displayName(o, locale)).join(", ")}
          </p>
        )}

        <p className="mt-6 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">
          {t.invested.method}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t.invested.illustration}</p>
      </section>
    </div>
  );
}
