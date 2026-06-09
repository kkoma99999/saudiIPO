import type { DividendRow } from "@/types/domain";
import { formatSar, formatPercent, formatDate, NA } from "@/lib/format";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { getI18n } from "@/lib/i18n/server";

export async function DividendHistoryTable({
  dividends,
  total,
  count,
  yieldOnOffer,
}: {
  dividends: DividendRow[];
  total: string | null;
  count: number;
  yieldOnOffer: number | null;
}) {
  const { t } = await getI18n();
  if (dividends.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.company.noDividends}</p>;
  }
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-start font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">{t.company.exDate}</th>
              <th className="px-3 py-2 text-end font-medium">{t.company.paid}</th>
              <th className="px-3 py-2 text-end font-medium">{t.company.adjusted}</th>
              <th className="px-3 py-2 text-end font-medium">{t.company.cumulative}</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {dividends.map((d, i) => (
              <tr key={`${d.exDate}-${i}`} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 font-mono text-xs tnum">{formatDate(d.exDate)}</td>
                <td className="px-3 py-2 text-end font-mono tnum">{formatSar(d.amount)}</td>
                <td className="px-3 py-2 text-end font-mono tnum text-muted-foreground">
                  {formatSar(d.adjustedAmount)}
                </td>
                <td className="px-3 py-2 text-end font-mono tnum">{formatSar(d.cumulative)}</td>
                <td className="px-2 py-2 text-end">{!d.verified && <UnverifiedBadge />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tot label={t.company.totalDividends} value={formatSar(total)} />
        <Tot label={t.company.payments} value={String(count)} />
        <Tot
          label={t.company.dividendYield}
          value={yieldOnOffer === null ? NA : formatPercent(yieldOnOffer, { sign: false })}
        />
      </div>
    </div>
  );
}

function Tot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-center">
      <div className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-lg tnum">{value}</div>
    </div>
  );
}
