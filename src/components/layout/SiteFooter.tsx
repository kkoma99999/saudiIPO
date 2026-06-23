import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-20 border-t border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md">{t.disclaimer.short}</p>
      </div>
    </footer>
  );
}
