"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/types/domain";

function fmtYear(iso: string) {
  return iso.slice(0, 4);
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  const company = get("company");
  const tasi = get("tasi");
  const rel = (v: number | undefined) =>
    v === undefined ? "n/a" : `${v - 100 >= 0 ? "+" : ""}${(v - 100).toFixed(1)}%`;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 font-mono text-xs shadow-md">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span style={{ color: "var(--color-chart-1)" }}>Company</span>
        <span className="tnum">{rel(company)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span style={{ color: "var(--color-chart-2)" }}>TASI</span>
        <span className="tnum">{rel(tasi)}</span>
      </div>
    </div>
  );
}

export function PriceVsTasiChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtYear}
            minTickGap={48}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            stroke="var(--color-muted-foreground)"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            stroke="var(--color-muted-foreground)"
            tickLine={false}
            width={40}
            domain={["auto", "auto"]}
          />
          <ReferenceLine
            y={100}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Tooltip content={<TooltipBox />} />
          <Line
            type="monotone"
            dataKey="tasi"
            stroke="var(--color-chart-2)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="company"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
