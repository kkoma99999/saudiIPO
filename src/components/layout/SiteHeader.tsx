import Link from "next/link";
import { MainNav } from "./MainNav";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 items-end justify-center gap-[2px] rounded-[4px] border border-primary/40 bg-primary/10 px-[3px] pb-[3px] pt-[4px]"
            >
              <span className="h-[35%] w-[2px] bg-primary/60" />
              <span className="h-[100%] w-[2px] bg-primary" />
              <span className="h-[60%] w-[2px] bg-primary/80" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Saudi <span className="text-primary">IPO</span> Tracker
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <MainNav />
          <span aria-hidden className="hidden h-4 w-px bg-border sm:inline-block" />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
