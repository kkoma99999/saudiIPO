import type { Metadata } from "next";
import { getAllCompanyMetrics } from "@/db/queries";
import { IpoTable } from "@/components/ipos/IpoTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { strings } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: strings.ipos.heading,
  description: strings.ipos.intro,
};

export default async function IposPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getAllCompanyMetrics();
  const initialYear = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {strings.ipos.heading}
        </h1>
        <p className="mt-3 text-muted-foreground">{strings.ipos.intro}</p>
      </header>
      {rows.length === 0 ? (
        <EmptyState message={strings.empty.noData} />
      ) : (
        <IpoTable rows={rows} initialYear={initialYear} />
      )}
    </div>
  );
}
