"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CompanyMetrics } from "@/types/domain";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { formatSar, formatDate, ipoYear } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { displayName, fmt } from "@/lib/i18n";

type SortKey =
  | "ipoDate"
  | "totalReturn"
  | "priceReturn"
  | "firstDaysReturn"
  | "alpha"
  | "offerPrice"
  | "cumulativeDividends";

const num = (v: number | null) => (v === null ? Number.NEGATIVE_INFINITY : v);

export function IpoTable({
  rows,
  initialYear,
}: {
  rows: CompanyMetrics[];
  initialYear?: number;
}) {
  const { locale, t } = useI18n();
  const [year, setYear] = useState<string>(initialYear ? String(initialYear) : "all");
  const [sector, setSector] = useState<string>("all");
  const [bucket, setBucket] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("ipoDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => ipoYear(r.ipoDate)))).sort((a, b) => b - a),
    [rows],
  );
  const sectors = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.sector).filter((s): s is string => !!s))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (year !== "all" && ipoYear(r.ipoDate) !== Number(year)) return false;
      if (sector !== "all" && r.sector !== sector) return false;
      if (bucket === "positive" && !(r.totalReturn !== null && r.totalReturn > 0)) return false;
      if (bucket === "negative" && !(r.totalReturn !== null && r.totalReturn < 0)) return false;
      if (
        q &&
        !r.nameEn.toLowerCase().includes(q) &&
        !r.symbol.includes(q) &&
        !(r.nameAr ?? "").includes(q)
      )
        return false;
      return true;
    });
    out.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "ipoDate") {
        av = a.ipoDate;
        bv = b.ipoDate;
      } else if (sortKey === "offerPrice") {
        av = Number(a.offerPrice);
        bv = Number(b.offerPrice);
      } else {
        av = num(a[sortKey]);
        bv = num(b[sortKey]);
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, year, sector, bucket, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const selectClass =
    "rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.filters.search}
          className={`${selectClass} w-52`}
        />
        <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">{t.filters.allYears}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className={selectClass} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">{t.filters.allSectors}</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="all">{t.filters.allReturns}</option>
          <option value="positive">{t.filters.aboveOffer}</option>
          <option value="negative">{t.filters.belowOffer}</option>
        </select>
        <span className="ms-auto font-mono text-xs text-muted-foreground">
          {fmt(t.filters.count, { n: filtered.length, m: rows.length })}
        </span>
      </div>

      <div className="overflow-x-auto rounded border border-border/70">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-start font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted-foreground">
              <Th>{t.table.company}</Th>
              <Th>{t.table.sector}</Th>
              <ThSort onClick={() => toggleSort("ipoDate")} active={sortKey === "ipoDate"} dir={sortDir} align="end">
                {t.table.ipoDate}
              </ThSort>
              <ThSort onClick={() => toggleSort("offerPrice")} active={sortKey === "offerPrice"} dir={sortDir} align="end">
                {t.table.offerPrice}
              </ThSort>
              <ThSort onClick={() => toggleSort("firstDaysReturn")} active={sortKey === "firstDaysReturn"} dir={sortDir} align="end" accent>
                {t.table.firstDays}
              </ThSort>
              <ThSort onClick={() => toggleSort("priceReturn")} active={sortKey === "priceReturn"} dir={sortDir} align="end">
                {t.table.priceReturn}
              </ThSort>
              <ThSort onClick={() => toggleSort("totalReturn")} active={sortKey === "totalReturn"} dir={sortDir} align="end">
                {t.table.totalReturn}
              </ThSort>
              <ThSort onClick={() => toggleSort("cumulativeDividends")} active={sortKey === "cumulativeDividends"} dir={sortDir} align="end">
                {t.table.dividends}
              </ThSort>
              <ThSort onClick={() => toggleSort("alpha")} active={sortKey === "alpha"} dir={sortDir} align="end">
                {t.table.vsTasi}
              </ThSort>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.symbol} className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2">
                  <Link href={`/company/${r.symbol}`} className="group flex items-center gap-2.5">
                    <CompanyLogo symbol={r.symbol} name={r.nameEn} size={26} />
                    <span className="font-mono text-xs text-muted-foreground tnum">{r.symbol}</span>
                    <span className="font-medium text-foreground group-hover:text-primary">{displayName(r, locale)}</span>
                    {!r.verified && <UnverifiedBadge />}
                    {r.dataCaveat && (
                      <span
                        title={r.dataCaveat}
                        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gold/60 bg-gold/15 font-mono text-[0.6rem] text-accent-foreground"
                      >
                        !
                      </span>
                    )}
                  </Link>
                </td>
                <td className="max-w-[14rem] truncate px-3 py-2 text-xs text-muted-foreground">{r.sector ?? ""}</td>
                <td className="px-3 py-2 text-end font-mono text-xs tnum">{formatDate(r.ipoDate)}</td>
                <td className="px-3 py-2 text-end font-mono tnum">{formatSar(r.offerPrice)}</td>
                <td
                  className="bg-gold/[0.03] px-3 py-2 text-end"
                  title={
                    r.firstDaysDate
                      ? `Offer to the close on the 5th trading day (${formatDate(r.firstDaysDate)})`
                      : "No clean first-week data: the early price series is gapped or under 5 sessions"
                  }
                >
                  <span className="inline-flex flex-col items-end gap-1">
                    <ReturnBadge value={r.firstDaysReturn} showArrow={false} />
                    {r.firstDaysReturn !== null && <FirstDaysBar value={r.firstDaysReturn} />}
                  </span>
                </td>
                <td className="px-3 py-2 text-end"><ReturnBadge value={r.priceReturn} showArrow={false} /></td>
                <td className="px-3 py-2 text-end"><ReturnBadge value={r.totalReturn} showArrow={false} /></td>
                <td className="px-3 py-2 text-end font-mono text-xs tnum text-muted-foreground">{formatSar(r.cumulativeDividends)}</td>
                <td className="px-3 py-2 text-end"><ReturnBadge value={r.alpha} showArrow={false} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t.empty.noResults}</p>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function ThSort({
  children,
  onClick,
  active,
  dir,
  align = "start",
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  align?: "start" | "end";
  accent?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "end" ? "text-end" : ""} ${
        accent ? "bg-gold/[0.045] text-gold" : ""
      }`}
    >
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase transition-colors ${
          accent ? "hover:text-gold/80" : "hover:text-foreground"
        } ${active ? (accent ? "text-gold" : "text-primary") : ""}`}
      >
        {children}
        <span className="text-[0.7em]">{active ? (dir === "asc" ? "^" : "v") : ""}</span>
      </button>
    </th>
  );
}

// Inline magnitude bar for the flagship First 5D column. The bar grows from a
// center baseline: positive values extend right in up-green, negative extend
// left in down-red. A value near +/-50% fills the half width; width is capped.
function FirstDaysBar({ value }: { value: number }) {
  const up = value >= 0;
  // value is a decimal return (0.5 == +50%). Scale so 0.5 fills the half (100%),
  // then cap so extreme values do not overflow the half track.
  const half = Math.min(Math.abs(value) / 0.5, 1) * 100;
  return (
    <span
      aria-hidden="true"
      className="relative flex h-[3px] w-[68px] overflow-hidden rounded-[1px] bg-border"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-muted-foreground/60" />
      <span
        className={`absolute inset-y-0 rounded-[1px] ${up ? "left-1/2 bg-primary" : "right-1/2 bg-down"}`}
        style={{ width: `${half / 2}%` }}
      />
    </span>
  );
}
