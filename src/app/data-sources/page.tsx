import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.nav.sources,
    description:
      locale === "ar"
        ? "من أين تأتي البيانات وماذا تعني شارة غير متحقَّق."
        : "Where the data comes from and what the unverified badge means.",
  };
}

export default async function DataSourcesPage() {
  const { locale, t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {t.nav.sources}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {t.disclaimer.short}{" "}
        {locale === "ar"
          ? "الأرقام هنا للمعلومات والبحث، وليست توصية بشراء أو بيع أي ورقة مالية."
          : "The numbers here are for information and research. They are not a recommendation to buy or sell any security."}
      </p>

      <Section
        title={locale === "ar" ? "من أين تأتي البيانات" : "Where the data comes from"}
      >
        <ul className="list-disc space-y-2 ps-5">
          <li>
            {locale === "ar"
              ? "الأسعار اليومية والتوزيعات والتجزئة تأتي من ياهو فاينانس عبر مكتبة yfinance، باستخدام صيغة الرمز {symbol}.SR."
              : "Daily prices, dividends, and splits come from Yahoo Finance through the yfinance library, using the {symbol}.SR ticker format."}
          </li>
          <li>
            {locale === "ar"
              ? "تفاصيل الطرح (سعر الطرح، تاريخ الإدراج، الأسهم المطروحة) تأتي من مقالات أرقام العامة وسعوديبيديا والأخبار المالية الموثوقة. كل صف طرح يسجّل الصفحة التي قُرئ منها بالضبط."
              : "IPO details (offer price, listing date, shares offered) come from public Argaam articles, Saudipedia, and reputable financial news. Each IPO row records the exact page it was read from."}
          </li>
          <li>
            {locale === "ar"
              ? "المقارنة بالسوق تستخدم مؤشر تاسي (^TASI.SR) على نفس المدة لكل شركة، وكلاهما مضبوط على 100 عند تاريخ الطرح."
              : "The market comparison uses the TASI index (^TASI.SR) over the same window as each company, both indexed to 100 at the IPO date."}
          </li>
        </ul>
      </Section>

      <Section
        title={locale === "ar" ? "كيف تُحسب العوائد" : "How returns are calculated"}
      >
        <p>
          {locale === "ar"
            ? "العوائد معدّلة لأسهم المنحة والتجزئة. يُقسم سعر الطرح على المعامل التراكمي للمنحة والتجزئة حتى يصبح قابلًا للمقارنة بالسعر الحالي. العائد الكلي يضيف التوزيعات النقدية للسهم الحالي. لا تُستخدم المقارنات السعرية الخام أبدًا لأن أسهم المنحة تجعلها خاطئة."
            : "Returns are adjusted for bonus issues and splits. The offer price is divided by the cumulative bonus and split factor so it is comparable to the current price. Total return adds cash dividends per current share. Raw price comparisons are never used because bonus shares would make them wrong."}
        </p>
      </Section>

      <Section title={locale === "ar" ? "شارة غير متحقَّق" : "The unverified badge"}>
        <p>
          {locale === "ar"
            ? "كل صف طرح يبدأ غير متحقَّق منه. يبقى الصف يحمل الشارة حتى يراجعه شخص مقابل مصدره ويؤكد الأرقام. تعامل مع الصفوف غير المتحقَّق منها على أنها مبدئية. بيانات ياهو على الرموز السعودية قد تحتوي فجوات أيضًا، لذا قد تكون بعض سلاسل الأسعار ناقصة. القيمة المفقودة تُترك فارغة بدلًا من تخمينها."
            : "Every IPO row starts unverified. A row keeps the badge until a person checks it against its source and confirms the numbers. Treat unverified rows as provisional. Yahoo data on Saudi tickers can also have gaps, so some price series may be incomplete. A missing value is left empty rather than guessed."}
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
