import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl px-5 py-28 text-center">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        {t.company.notFound}
      </h1>
      <p className="mt-3 text-muted-foreground">
        No tracked company has that symbol. Symbols are 4 digits.
      </p>
      <Link
        href="/ipos"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
      >
        Browse all IPOs
      </Link>
    </div>
  );
}
