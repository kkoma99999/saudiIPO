import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_COOKIE } from "@/lib/theme";
import { dirFor } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { strings } from "@/lib/i18n/strings";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Terminal aesthetic: a true monospace carries the English interface, with Geist as a
// clean sans for the few large display headings. Arabic uses Thmanyah Sans, the free
// Thmanyah typeface (font.thmanyah.com), self-hosted from app/fonts/thmanyah.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const arabic = localFont({
  variable: "--font-arabic",
  display: "swap",
  src: [
    { path: "./fonts/thmanyah/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyah/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyah/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyah/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/thmanyah/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: strings.site.title, template: `%s | ${strings.site.title}` },
  description: strings.site.tagline,
  openGraph: {
    type: "website",
    siteName: strings.site.title,
    title: strings.site.title,
    description: strings.site.tagline,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before paint. With no theme cookie the class falls back to the system
// preference; with a cookie the server already rendered the right class and this
// is a no-op. Keeps the first visit from flashing the wrong theme.
const themeInit = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);if(m?m[1]==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const direction = dirFor(locale);
  const theme = (await cookies()).get(THEME_COOKIE)?.value;

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${arabic.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <I18nProvider value={{ locale, dir: direction, t }}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
