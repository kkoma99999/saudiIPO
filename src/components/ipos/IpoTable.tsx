"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CompanyMetrics } from "@/types/domain";
import { ReturnBadge } from "@/components/shared/ReturnBadge";
import { UnverifiedBadge } from "@/components/shared/UnverifiedBadge";
import { formatSar, formatDate, ipoYear } from "@/lib/format";
import { strings } from "@/lib/i18n/strings";

type SortKey = "ipoDate" | "totalReturn" | "priceReturn" | "alpha" | "offerPrice";

const num = (v: number | null) => (v === null ? Number.NEGATIVE_INFINITY : v);

export function IpoTable({
  rows,
  initialYear,
}: {
  rows: CompanyMetrics[];
  initialYear?: number;
}) {
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
      if (q && !r.nameEn.toLowerCase().includes(q) && !r.symbol.includes(q)) return false;
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
          placeholder="Search name or symbol"
          className={`${selectClass} w-52`}
        />
        <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className={selectClass} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="all">All returns</option>
          <option value="positive">Above offer</option>
          <option value="negative">Below offer</option>
        </select>
        <span className="ms-auto font-mono text-xs text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
              <Th>{strings.table.company}</Th>
              <Th>{strings.table.sector}</Th>
              <ThSort onClick={() => toggleSort("ipoDate")} active={sortKey === "ipoDate"} dir={sortDir} align="right">
                {strings.table.ipoDate}
              </ThSort>
              <ThSort onClick={() => toggleSort("offerPrice")} active={sortKey === "offerPrice"} dir={sortDir} align="right">
                {strings.table.offerPrice}
              </ThSort>
              <ThSort onClick={() => toggleSort("priceReturn")} active={sortKey === "priceReturn"} dir={sortDir} align="right">
                {strings.table.priceReturn}
              </ThSort>
              <ThSort onClick={() => toggleSort("totalReturn")} active={sortKey === "totalReturn"} dir={sortDir} align="right">
                {strings.table.totalReturn}
              </ThSort>
              <ThSort onClick={() => toggleSort("alpha")} active={sortKey === "alpha"} dir={sortDir} align="right">
                {strings.table.vsTasi}
              </ThSort>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.symbol} className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2.5">
                  <Link href={`/company/${r.symbol}`} className="group flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground tnum">{r.symbol}</span>
                    <span className="font-medium text-foreground group-hover:text-primary">{r.nameEn}</span>
                    {!r.verified && <UnverifiedBadge />}
                  </Link>
                </td>
                <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs text-muted-foreground">{r.sector ?? ""}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tnum">{formatDate(r.ipoDate)}</td>
                <td className="px-3 py-2.5 text-right font-mono tnum">{formatSar(r.offerPrice)}</td>
                <td className="px-3 py-2.5 text-right"><ReturnBadge value={r.priceReturn} showArrow={false} /></td>
                <td className="px-3 py-2.5 text-right"><ReturnBadge value={r.totalReturn} showArrow={false} /></td>
                <td className="px-3 py-2.5 text-right"><ReturnBadge value={r.alpha} showArrow={false} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{strings.empty.noResults}</p>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 font-medium">{children}</th>;
}

function ThSort({
  children,
  onClick,
  active,
  dir,
  align = "left",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  align?: "left" | "right";
}) {
  return (
    <th className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : ""}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground ${active ? "text-primary" : ""}`}
      >
        {children}
        <span className="text-[0.7em]">{active ? (dir === "asc" ? "^" : "v") : ""}</span>
      </button>
    </th>
  );
}
