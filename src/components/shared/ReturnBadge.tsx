import { formatPercent, NA } from "@/lib/format";

function Arrow({ up }: { up: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden="true"
      className="shrink-0"
    >
      {up ? (
        <path d="M4 0 L8 6 L0 6 Z" fill="currentColor" />
      ) : (
        <path d="M4 8 L0 2 L8 2 Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function ReturnBadge({
  value,
  size = "sm",
  showArrow = true,
}: {
  value: number | null;
  size?: "sm" | "lg";
  showArrow?: boolean;
}) {
  if (value === null) {
    return <span className="font-mono text-muted-foreground tnum">{NA}</span>;
  }
  const up = value >= 0;
  const text = size === "lg" ? "text-2xl" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono ${text} tnum ${up ? "text-up" : "text-down"}`}
    >
      {showArrow && <Arrow up={up} />}
      {formatPercent(value)}
    </span>
  );
}
