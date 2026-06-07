import { intlLocale } from "./i18n/config";

// Placeholder for a missing value. Plain text, no em dash.
export const NA = "n/a";

const sarFmt = new Intl.NumberFormat(intlLocale, {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat(intlLocale, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function toNum(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

// SAR money, halala precision.
export function formatSar(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : sarFmt.format(n);
}

// A ratio like 0.352 shown as +35.2%. Set sign:false to drop the leading plus.
export function formatPercent(
  ratio: number | string | null | undefined,
  opts: { sign?: boolean; digits?: number } = {},
): string {
  const n = toNum(ratio);
  if (n === null) return NA;
  const { sign = true, digits = 1 } = opts;
  const pct = n * 100;
  const prefix = sign && pct > 0 ? "+" : "";
  return `${prefix}${pct.toFixed(digits)}%`;
}

// Plain number with grouping, for share counts.
export function formatCount(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : new Intl.NumberFormat(intlLocale).format(n);
}

// 'YYYY-MM-DD' to a readable date.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return NA;
  return dateFmt.format(new Date(iso + "T00:00:00Z"));
}

export function ipoYear(iso: string): number {
  return Number(iso.slice(0, 4));
}
