import Link from "next/link";
import { strings } from "@/lib/i18n/strings";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md">{strings.disclaimer.short}</p>
        <div className="flex items-center gap-4 font-mono text-[0.68rem] uppercase tracking-[0.12em]">
          <Link href="/data-sources" className="transition-colors hover:text-foreground">
            {strings.nav.sources}
          </Link>
          <span>Data via yfinance and Argaam</span>
        </div>
      </div>
    </footer>
  );
}
