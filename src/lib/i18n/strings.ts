// All user-facing copy lives here so a second locale is a contained change later.
// Style: plain and direct. No em dashes, no emojis, no filler words.
export const strings = {
  site: {
    title: "Saudi IPO Tracker",
    tagline: "TASI Main Market listings since December 2019.",
  },
  nav: {
    home: "Cohorts",
    ipos: "All IPOs",
    sources: "Data sources",
  },
  home: {
    heading: "IPO cohorts by year",
    intro:
      "Every Saudi Main Market IPO since December 2019, grouped by listing year. Returns are adjusted for bonus issues and splits and measured against the offer price.",
  },
  ipos: {
    heading: "All IPOs",
    intro: "Sort and filter every tracked Main Market IPO.",
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
} as const;
