import Link from "next/link";
import { MainNav } from "./MainNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Saudi <span className="italic text-primary">IPO</span> Tracker
          </span>
          <span className="hidden font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            TASI
          </span>
        </Link>
        <MainNav />
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
    </header>
  );
}
