// Lightweight i18n config. English now, structured so Arabic and RTL can be added
// later by changing these constants and adding an Arabic dictionary. No i18n
// framework yet on purpose.
export const locale = "en" as const;
export const dir = "ltr" as const;
export const intlLocale = "en-SA";

export type Locale = typeof locale;
