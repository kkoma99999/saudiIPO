import type { Metadata } from "next";
import { strings } from "@/lib/i18n/strings";

export const metadata: Metadata = {
  title: strings.nav.sources,
  description: "Where the data comes from and what the unverified badge means.",
};

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Data sources</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {strings.disclaimer.short} The numbers here are for information and research.
        They are not a recommendation to buy or sell any security.
      </p>

      <Section title="Where the data comes from">
        <ul className="list-disc space-y-2 ps-5">
          <li>
            Daily prices, dividends, and splits come from Yahoo Finance through the
            yfinance library, using the {"{symbol}.SR"} ticker format.
          </li>
          <li>
            IPO details (offer price, listing date, shares offered) come from public
            Argaam articles, Saudipedia, and reputable financial news. Each IPO row
            records the exact page it was read from.
          </li>
          <li>
            The market comparison uses the TASI index (^TASI.SR) over the same window
            as each company, both indexed to 100 at the IPO date.
          </li>
        </ul>
      </Section>

      <Section title="How returns are calculated">
        <p>
          Returns are adjusted for bonus issues and splits. The offer price is divided
          by the cumulative bonus and split factor so it is comparable to the current
          price. Total return adds cash dividends per current share. Raw price
          comparisons are never used because bonus shares would make them wrong.
        </p>
      </Section>

      <Section title="The unverified badge">
        <p>
          Every IPO row starts unverified. A row keeps the badge until a person checks
          it against its source and confirms the numbers. Treat unverified rows as
          provisional. Yahoo data on Saudi tickers can also have gaps, so some price
          series may be incomplete. A missing value is left empty rather than guessed.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 border-b border-border/60 pb-2 font-display text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
