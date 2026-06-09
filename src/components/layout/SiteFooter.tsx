import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-20 border-t border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md normal-case tracking-normal">{t.disclaimer.short}</p>
        <div className="flex items-center gap-4">
          <Link href="/data-sources" className="transition-colors hover:text-primary">
            {t.nav.sources}
          </Link>
          <span>DATA: SAUDIEXCHANGE.SA, ARGAAM</span>
        </div>
      </div>
    </footer>
  );
}
