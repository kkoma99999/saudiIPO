import Link from "next/link";
import { MainNav } from "./MainNav";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex items-center gap-2.5">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,224,138,0.8)]" />
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              Saudi <span className="text-primary">IPO</span> Tracker
            </span>
          </span>
          <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground sm:inline">
            TADAWUL // TASI
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <MainNav />
          <span aria-hidden className="text-border">
            |
          </span>
          <LocaleSwitcher />
          <span
            aria-hidden
            className="inline-block h-3 w-[7px] bg-primary motion-safe:animate-pulse"
          />
        </div>
      </div>
    </header>
  );
}
