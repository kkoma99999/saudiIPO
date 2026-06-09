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
    <div className="rounded-sm border border-border/70 bg-card px-4 py-3.5">
      <div className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        <span aria-hidden="true" className="text-[0.7em] leading-none opacity-70">
          ◆
        </span>
        {label}
      </div>
      <div className="mt-3 font-mono text-2xl leading-none tnum">{children}</div>
      {hint && <div className="mt-2 font-mono text-[0.7rem] text-muted-foreground">{hint}</div>}
    </div>
  );
}
