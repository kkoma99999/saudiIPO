import { intlLocale } from "./i18n/config";

// Placeholder for a missing value. Plain text, no em dash.
export const NA = "n/a";

// Placeholder for a value that is not disclosed, distinct from not applicable. Used
// where a company did not publish a figure (for example a minimum allocation).
export const ND = "n/d";

const sarFmt = new Intl.NumberFormat(intlLocale, {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Compact SAR for large headline figures, for example SAR 446B or SAR 96M. Used for
// proceeds and big share counts where halala precision is noise. Prices keep full 2dp.
const sarCompactFmt = new Intl.NumberFormat(intlLocale, {
  style: "currency",
  currency: "SAR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const countCompactFmt = new Intl.NumberFormat(intlLocale, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const multipleFmt = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 });

// Cache a number formatter per fraction-digit count so repeated calls reuse it rather
// than rebuilding an Intl.NumberFormat each time.
const fixedFmtByDigits = new Map<number, Intl.NumberFormat>();
function fixedFmt(digits: number): Intl.NumberFormat {
  let f = fixedFmtByDigits.get(digits);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: digits });
    fixedFmtByDigits.set(digits, f);
  }
  return f;
}

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

// Compact SAR for large headline figures (SAR 446B). Falls back to n/a when missing.
export function formatSarCompact(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : sarCompactFmt.format(n);
}

// A valuation multiple, for example 22.5x. One decimal, n/a when missing.
export function formatMultiple(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : `${multipleFmt.format(n)}x`;
}

// A value already expressed as a percent (for example 12.3 means 12.3 percent), shown
// with a percent sign. Distinct from formatPercent, which takes a ratio (0.123) and
// multiplies by 100. Used for stored allocation percentages.
export function formatPctValue(
  value: number | string | null | undefined,
  digits = 1,
): string {
  const n = toNum(value);
  return n === null ? NA : `${fixedFmt(digits).format(n)}%`;
}

// Plain number with grouping, for share counts.
export function formatCount(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : new Intl.NumberFormat(intlLocale).format(n);
}

// Compact share count, for example 3B or 95M, for large headline counts.
export function formatCountCompact(value: number | string | null | undefined): string {
  const n = toNum(value);
  return n === null ? NA : countCompactFmt.format(n);
}

// 'YYYY-MM-DD' to a readable date.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return NA;
  return dateFmt.format(new Date(iso + "T00:00:00Z"));
}

export function ipoYear(iso: string): number {
  return Number(iso.slice(0, 4));
}
