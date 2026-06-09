// Shared view-model types for the UI. Money fields stay as strings from the
// database; ratios are numbers (or null when they cannot be computed).

export interface IpoRow {
  symbol: string;
  nameEn: string;
  nameAr: string | null;
  sector: string | null;
  ipoDate: string;
  offerPrice: string;
  nominalValue: string | null;
  verified: boolean;
  dataCaveat: string | null;
}

export interface CompanyMetrics extends IpoRow {
  currentPrice: string | null;
  currentDate: string | null;
  priceReturn: number | null;
  totalReturn: number | null;
  firstDaysReturn: number | null; // offer price to the close on the 5th trading day
  firstDaysDate: string | null; // date of that early close
  yieldOnOffer: number | null;
  cagr: number | null;
  tasiReturn: number | null;
  alpha: number | null;
  hasActions: boolean;
  cumulativeDividends: number | null; // adjusted to current-share basis, SAR
  dividendCount: number;
}

export interface CohortSummary {
  year: number;
  count: number;
  verifiedCount: number;
  avgTotalReturn: number | null;
  medianTotalReturn: number | null;
  positiveCount: number;
  best: { symbol: string; nameEn: string; totalReturn: number } | null;
  worst: { symbol: string; nameEn: string; totalReturn: number } | null;
}

export interface SeriesPoint {
  date: string;
  company: number | null;
  tasi: number | null;
}

export interface DividendRow {
  exDate: string;
  amount: string; // SAR per share as paid
  adjustedAmount: string; // SAR per current share
  cumulative: string; // running cumulative of adjustedAmount
  verified: boolean;
}

export interface ActionRow {
  actionDate: string;
  kind: string;
  factor: string;
  sourceUrl: string | null;
}

export interface CompanyDetail {
  metrics: CompanyMetrics;
  shares: string | null;
  proceeds: string | null;
  oversubscription: string | null;
  nominalValue: string | null;
  premium: string | null; // offer_price - nominal_value
  sourceUrl: string;
  series: SeriesPoint[];
  dividends: DividendRow[];
  totalDividends: string | null; // adjusted, SAR per current share
  dividendYieldOnOffer: number | null;
  actions: ActionRow[];
}
