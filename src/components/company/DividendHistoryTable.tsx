import type { DividendRow } from "@/types/domain";
import { formatSar, formatDate } from "@/lib/format";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { strings } from "@/lib/i18n/strings";

export function DividendHistoryTable({ dividends }: { dividends: DividendRow[] }) {
  if (dividends.length === 0) {
    return <p className="text-sm text-muted-foreground">{strings.company.noDividends}</p>;
  }
  const total = dividends.reduce((acc, d) => acc + Number(d.amount), 0);
  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="px-3 py-2 font-medium">{strings.company.exDate}</th>
            <th className="px-3 py-2 text-right font-medium">{strings.company.amount}</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {[...dividends].reverse().map((d, i) => (
            <tr key={`${d.exDate}-${i}`} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-xs tnum">{formatDate(d.exDate)}</td>
              <td className="px-3 py-2 text-right font-mono tnum">{formatSar(d.amount)}</td>
              <td className="px-3 py-2 text-right">{!d.verified && <UnverifiedBadge />}</td>
            </tr>
          ))}
          <tr className="bg-secondary/30 font-mono text-xs">
            <td className="px-3 py-2 uppercase tracking-wide text-muted-foreground">Total paid</td>
            <td className="px-3 py-2 text-right tnum">{formatSar(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
