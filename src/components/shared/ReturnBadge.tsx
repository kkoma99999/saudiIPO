import { formatPercent, NA } from "@/lib/format";

function Triangle({ up }: { up: boolean }) {
  // Small filled direction marker in terminal style. Up triangle for gains,
  // down triangle for losses. Color is inherited from the parent.
  return (
    <span aria-hidden="true" className="shrink-0 text-[0.6em] leading-none">
      {up ? "▲" : "▼"}
    </span>
  );
}

export function ReturnBadge({
  value,
  size = "sm",
  showArrow = true,
  nullLabel = NA,
}: {
  value: number | null;
  size?: "sm" | "lg";
  showArrow?: boolean;
  // Marker shown when value is null. Defaults to "n/a"; pass "n/d" for not-disclosed.
  nullLabel?: string;
}) {
  if (value === null) {
    return <span className="font-mono tabular-nums tnum text-muted-foreground">{nullLabel}</span>;
  }
  const positive = value > 0;
  const negative = value < 0;
  const tone = positive ? "text-up" : negative ? "text-down" : "text-muted-foreground";
  const text = size === "lg" ? "text-2xl" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono tabular-nums tnum ${text} ${tone}`}
    >
      {showArrow && (positive || negative) && <Triangle up={positive} />}
      {formatPercent(value)}
    </span>
  );
}
