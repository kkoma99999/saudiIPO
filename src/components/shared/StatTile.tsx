export function StatTile({
  label,
  children,
  hint,
  accent = false,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  // Gold left-edge bar and gold label, to single out one tile (for example First 5D).
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border/70 bg-card px-5 py-4${
        accent ? " shadow-[inset_3px_0_0_0_var(--color-gold)]" : ""
      }`}
    >
      <div className={`text-xs font-medium ${accent ? "text-gold" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="mt-3 text-2xl leading-none tnum">{children}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
