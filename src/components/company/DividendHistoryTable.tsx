import type { DividendRow } from "@/types/domain";
import { formatSar, formatPercent, formatDate, NA } from "@/lib/format";
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
      <div className="overflow-hidden rounded-lg border border-border/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-start text-[0.7rem] font-medium text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">{t.company.exDate}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t.company.paid}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t.company.adjusted}</th>
              <th className="px-3 py-2.5 text-end font-medium">{t.company.cumulative}</th>
            </tr>
          </thead>
          <tbody>
            {dividends.map((d, i) => (
              <tr key={`${d.exDate}-${i}`} className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2.5 text-xs tnum">{formatDate(d.exDate)}</td>
                <td className="px-3 py-2.5 text-end tnum">{formatSar(d.amount)}</td>
                <td className="px-3 py-2.5 text-end tnum text-muted-foreground">
                  {formatSar(d.adjustedAmount)}
                </td>
                <td className="px-3 py-2.5 text-end tnum">{formatSar(d.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
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
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2.5 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg tnum">{value}</div>
    </div>
  );
}
