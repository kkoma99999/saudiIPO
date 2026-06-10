import Link from "next/link";
import type { CompanyMetrics } from "@/types/domain";
import { getAllCompanyMetrics } from "@/db/queries";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { getI18n } from "@/lib/i18n/server";

// Site-wide ticker tape under the header. Shows the total return since IPO for every
// tracked listing with a price, newest listing first. Pure CSS marquee: the track holds
// two copies of the strip and slides one strip width per loop. Hover pauses it.
// If the database is unreachable the tape renders nothing; it never shows stale or
// made-up figures.
export async function TickerTape() {
  let rows: CompanyMetrics[];
  try {
    rows = await getAllCompanyMetrics();
  } catch {
    return null;
  }
  const { t } = await getI18n();

  const items = rows
    .filter((r) => r.totalReturn !== null)
    .sort((a, b) => b.ipoDate.localeCompare(a.ipoDate));
  if (items.length < 4) return null;

  // Roughly 2.5s per item keeps the speed constant as coverage grows.
  const duration = `${Math.round(items.length * 2.5)}s`;

  return (
    <div
      aria-label={t.ticker.label}
      dir="ltr"
      className="tape relative overflow-hidden border-b border-border/70 bg-card/50"
    >
      <div
        className="tape-track flex w-max items-center"
        style={{ "--tape-duration": duration } as React.CSSProperties}
      >
        <Strip items={items} />
        <Strip items={items} clone />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}

// The visible copy uses links; the clone is decorative only, so it renders plain
// spans and stays out of the accessibility tree and tab order.
function Strip({ items, clone = false }: { items: CompanyMetrics[]; clone?: boolean }) {
  return (
    <div aria-hidden={clone || undefined} className="flex items-center">
      {items.map((r) =>
        clone ? (
          <span key={r.symbol} className="flex shrink-0 items-center gap-2 border-l border-border/40 px-4 py-1.5 text-xs">
            <span className="tnum text-muted-foreground">{r.symbol}</span>
            <ReturnBadge value={r.totalReturn} />
          </span>
        ) : (
          <Link
            key={r.symbol}
            href={`/company/${r.symbol}`}
            className="flex shrink-0 items-center gap-2 border-l border-border/40 px-4 py-1.5 text-xs transition-colors hover:bg-accent/40"
          >
            <span className="tnum text-muted-foreground">{r.symbol}</span>
            <ReturnBadge value={r.totalReturn} />
          </Link>
        ),
      )}
    </div>
  );
}
