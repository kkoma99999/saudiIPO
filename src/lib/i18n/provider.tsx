"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./strings";

export interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dict;
}

const I18nContext = createContext<I18nValue | null>(null);

// Seeded once in the root layout from the server-read locale. Client components read
// the active locale and dictionary from here with useI18n.
export function I18nProvider({
  value,
  children,
}: {
  value: I18nValue;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
