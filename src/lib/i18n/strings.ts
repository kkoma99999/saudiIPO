// All user-facing copy lives here, English and Arabic. Style: plain and direct. No em
// dashes, no emojis, no filler words. Templates use {n} and {m} placeholders filled by
// the fmt helper in ./index. The Arabic dictionary must mirror the English shape exactly,
// which TypeScript enforces through the Dict type.

const en = {
  site: {
    title: "Saudi IPO Tracker",
    tagline: "TASI Main Market listings since 2018.",
  },
  nav: {
    home: "Cohorts",
    ipos: "All IPOs",
    sources: "Data sources",
  },
  ticker: {
    label: "Total return since IPO for every tracked listing",
  },
  switcher: {
    label: "Language",
    english: "EN",
    arabic: "ع",
  },
  theme: {
    toggle: "Switch theme",
  },
  home: {
    heading: "IPO cohorts by year",
    intro:
      "Every Saudi Main Market IPO since 2018, grouped by listing year. Returns are adjusted for bonus issues and splits and measured against the offer price.",
    cohortsByYear: "Cohorts by year",
    totalReturnAdjusted: "total return, adjusted",
    iposTracked: "IPOs tracked",
    medianTotalReturn: "Median total return",
    aboveOffer: "Above offer",
    unverified: "Unverified",
    withPrices: "of {n} with prices",
    awaitingSource: "awaiting source check",
  },
  ipos: {
    heading: "All IPOs",
    intro: "Sort and filter every tracked Main Market IPO.",
  },
  filters: {
    search: "Search name or symbol",
    allYears: "All years",
    allSectors: "All sectors",
    allReturns: "All returns",
    aboveOffer: "Above offer",
    belowOffer: "Below offer",
    count: "{n} of {m}",
  },
  table: {
    company: "Company",
    symbol: "Symbol",
    sector: "Sector",
    ipoDate: "IPO date",
    offerPrice: "Offer price",
    price: "Price",
    firstDays: "First 5D",
    priceReturn: "Price return",
    totalReturn: "Total return",
    dividends: "Cum. div",
    vsTasi: "vs TASI",
    year: "Year",
    all: "All",
    unverifiedNote: "Every figure is provisional until each row is checked against its source.",
  },
  cohort: {
    listings: "{n} listings",
    medianTotalReturn: "Median total return",
    average: "Average",
    aboveOfferCount: "{n} of {m} above offer",
    best: "Best",
  },
  company: {
    offerPrice: "Offer price",
    currentPrice: "Current price",
    firstDays: "First 5 days",
    priceReturn: "Price return",
    totalReturn: "Total return",
    yieldOnOffer: "Yield on offer",
    cagr: "CAGR",
    vsTasi: "Return vs TASI",
    ipoDate: "IPO date",
    sector: "Sector",
    nominalValue: "Nominal value",
    premium: "Premium over par",
    chartTitle: "Price vs TASI, indexed to 100 at IPO",
    dividends: "Dividends since IPO",
    exDate: "Ex date",
    paid: "Paid per share",
    adjusted: "Per current share",
    cumulative: "Cumulative",
    payments: "Payments",
    totalDividends: "Total since IPO",
    dividendYield: "Yield on offer",
    noDividends: "No dividends recorded yet.",
    actions: "Bonus issues, splits, par changes",
    actionDate: "Date",
    factor: "Factor",
    notFound: "Company not found",
  },
  detail: {
    ipoDetails: "IPO details",
    sharesOffered: "Shares offered",
    proceeds: "Proceeds",
    oversubscription: "Oversubscription",
    source: "Source",
    listed: "Listed",
    dataNote: "Data note",
    legendCompany: "Company",
    legendTasi: "TASI",
  },
  badge: {
    unverified: "Unverified",
    unverifiedHelp:
      "This row has not been checked against a primary source. Treat the numbers as provisional.",
  },
  empty: {
    noData: "No data yet.",
    noResults: "No IPOs match these filters.",
  },
  disclaimer: {
    short: "Informational only. This is not investment advice.",
  },
};

export type Dict = typeof en;

const ar: Dict = {
  site: {
    title: "متتبّع الطروحات السعودية",
    tagline: "إدراجات السوق الرئيسية (تاسي) منذ 2018.",
  },
  nav: {
    home: "الدفعات",
    ipos: "كل الطروحات",
    sources: "مصادر البيانات",
  },
  ticker: {
    label: "العائد الكلي منذ الطرح لكل الإدراجات المتتبَّعة",
  },
  switcher: {
    label: "اللغة",
    english: "EN",
    arabic: "ع",
  },
  theme: {
    toggle: "تبديل المظهر",
  },
  home: {
    heading: "الطروحات حسب سنة الإدراج",
    intro:
      "كل طرح في السوق الرئيسية السعودية منذ 2018، مرتّب حسب سنة الإدراج. العوائد معدّلة لأسهم المنحة والتجزئة، ومقيسة على سعر الطرح.",
    cohortsByYear: "الدفعات حسب السنة",
    totalReturnAdjusted: "العائد الكلي، معدّلًا",
    iposTracked: "طروحات متتبَّعة",
    medianTotalReturn: "وسيط العائد الكلي",
    aboveOffer: "فوق سعر الطرح",
    unverified: "غير متحقَّق",
    withPrices: "من {n} لها أسعار",
    awaitingSource: "بانتظار التحقق من المصدر",
  },
  ipos: {
    heading: "كل الطروحات",
    intro: "رتّب وصفِّ كل طرح متتبَّع في السوق الرئيسية.",
  },
  filters: {
    search: "ابحث بالاسم أو الرمز",
    allYears: "كل السنوات",
    allSectors: "كل القطاعات",
    allReturns: "كل العوائد",
    aboveOffer: "فوق الطرح",
    belowOffer: "تحت الطرح",
    count: "{n} من {m}",
  },
  table: {
    company: "الشركة",
    symbol: "الرمز",
    sector: "القطاع",
    ipoDate: "تاريخ الطرح",
    offerPrice: "سعر الطرح",
    price: "السعر",
    firstDays: "أول 5 أيام",
    priceReturn: "عائد السعر",
    totalReturn: "العائد الكلي",
    dividends: "التوزيعات",
    vsTasi: "مقابل تاسي",
    year: "السنة",
    all: "الكل",
    unverifiedNote: "كل رقم هنا مبدئي حتى يُتحقَّق من كل صف مقابل مصدره.",
  },
  cohort: {
    listings: "{n} طرح",
    medianTotalReturn: "وسيط العائد الكلي",
    average: "المتوسط",
    aboveOfferCount: "{n} من {m} فوق الطرح",
    best: "الأفضل",
  },
  company: {
    offerPrice: "سعر الطرح",
    currentPrice: "السعر الحالي",
    firstDays: "أول 5 أيام",
    priceReturn: "عائد السعر",
    totalReturn: "العائد الكلي",
    yieldOnOffer: "العائد على الطرح",
    cagr: "النمو السنوي المركّب",
    vsTasi: "العائد مقابل تاسي",
    ipoDate: "تاريخ الطرح",
    sector: "القطاع",
    nominalValue: "القيمة الاسمية",
    premium: "العلاوة على الاسمية",
    chartTitle: "السعر مقابل تاسي، مضبوطًا على 100 عند الطرح",
    dividends: "التوزيعات منذ الطرح",
    exDate: "تاريخ الأحقية",
    paid: "الموزّع للسهم",
    adjusted: "للسهم الحالي",
    cumulative: "التراكمي",
    payments: "عدد التوزيعات",
    totalDividends: "الإجمالي منذ الطرح",
    dividendYield: "العائد على الطرح",
    noDividends: "لا توجد توزيعات مسجّلة بعد.",
    actions: "المنح والتجزئة وتغيّر القيمة الاسمية",
    actionDate: "التاريخ",
    factor: "المعامل",
    notFound: "الشركة غير موجودة",
  },
  detail: {
    ipoDetails: "تفاصيل الطرح",
    sharesOffered: "الأسهم المطروحة",
    proceeds: "حصيلة الطرح",
    oversubscription: "تغطية الاكتتاب",
    source: "المصدر",
    listed: "أُدرج في",
    dataNote: "ملاحظة بيانات",
    legendCompany: "الشركة",
    legendTasi: "تاسي",
  },
  badge: {
    unverified: "غير متحقَّق",
    unverifiedHelp:
      "لم يُتحقَّق من هذا الصف مقابل مصدر أساسي. تعامل مع الأرقام على أنها مبدئية.",
  },
  empty: {
    noData: "لا توجد بيانات بعد.",
    noResults: "لا توجد طروحات مطابقة لهذه التصفية.",
  },
  disclaimer: {
    short: "للمعلومات فقط. هذا ليس نصيحة استثمارية.",
  },
};

import type { Locale } from "./config";

export const dictionaries: Record<Locale, Dict> = { en, ar };

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

// Backward-compatible alias. Some modules still import the English dictionary directly.
export const strings = en;
