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

// First trading day figures, present only when the price series starts at the listing.
export interface DebutStats {
  date: string; // first session date
  return: number | null; // offer price to first-session close (the IPO pop)
  rangePct: number | null; // (high - low) / open for the first session
  turnover: string | null; // SAR value traded on the first session
}

// Highest close since listing and the drawdown from it.
export interface PeakStats {
  date: string;
  close: string; // SAR, current-share basis
  drawdown: number; // latest / peak - 1, <= 0
}

// Offer-price valuation. The per-share inputs come from the نشرة الإصدار (prospectus);
// the multiples are computed against the offer price. Point in time, never adjusted.
export interface IpoValuation {
  recurringEpsTtm: string | null; // SAR per share, sourced
  bookValuePerShare: string | null; // SAR per share, sourced
  peRecurringTtm: number | null; // offer / recurring EPS, null when EPS not positive
  priceToBook: number | null; // offer / book value per share, null when not positive
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
  debut: DebutStats | null;
  peak: PeakStats | null;
  valuation: IpoValuation | null;
  tradingSessions: number;
  isNewlyListed: boolean;
}
