// Shared view-model types for the UI. Money fields stay as strings from the
// database; ratios are numbers (or null when they cannot be computed).

export interface IpoRow {
  symbol: string;
  nameEn: string;
  nameAr: string | null;
  sector: string | null;
  ipoDate: string;
  offerPrice: string;
  verified: boolean;
}

export interface CompanyMetrics extends IpoRow {
  currentPrice: string | null;
  currentDate: string | null;
  priceReturn: number | null;
  totalReturn: number | null;
  yieldOnOffer: number | null;
  cagr: number | null;
  tasiReturn: number | null;
  alpha: number | null;
  hasActions: boolean;
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
  amount: string;
  verified: boolean;
}

export interface ActionRow {
  actionDate: string;
  type: string;
  factor: string;
}

export interface CompanyDetail {
  metrics: CompanyMetrics;
  shares: string | null;
  proceeds: string | null;
  oversubscription: string | null;
  sourceUrl: string;
  series: SeriesPoint[];
  dividends: DividendRow[];
  actions: ActionRow[];
}
