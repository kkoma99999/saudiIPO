import { hasLogo } from "@/lib/logos";

// Company logo from Tadawul (public/logos/{symbol}.png). Companies without a logo
// on file fall back to a monogram tile showing the symbol. Logos sit on a white
// chip so transparent and white-background logos both read cleanly.
export function CompanyLogo({
  symbol,
  name,
  size = 28,
}: {
  symbol: string;
  name: string;
  size?: number;
}) {
  if (hasLogo(symbol)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/logos/${symbol}.png`}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className="shrink-0 rounded-md bg-white object-contain p-0.5 ring-1 ring-border/60"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      className="grid shrink-0 place-items-center rounded-md bg-secondary font-mono font-medium tabular-nums text-muted-foreground ring-1 ring-border/60"
    >
      {symbol}
    </div>
  );
}
