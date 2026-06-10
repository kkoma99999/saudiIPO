export function StatTile({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="hud-corners rounded-lg border border-border/70 bg-card px-5 py-4 transition-colors hover:border-primary/30">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-3 text-2xl leading-none tnum">{children}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
