// Shared view-model types for the UI. Money fields stay as strings from the
// database; ratios are numbers (or null when they cannot be computed).

import type { RetailOutcomeResult } from "@/lib/retail-outcome";

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
  // When the current price comes from a live Sahmk quote, the source's update time
  // (ISO 8601) and whether it is delayed; both null/false for an end-of-day close.
  // currentDate carries the date in both cases. Drives the "as of" freshness label.
  quoteTime: string | null;
  priceIsDelayed: boolean;
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
  // Total return on the minimum allocation, equal to total_return (a per-share return
  // is allocation independent). Null when no minimum allocation is on record.
  minAllocPnl: number | null;
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

// A bank or advisor on the IPO. role is one of the standard mandate types.
export interface Advisor {
  name: string;
  role: string;
}

// Allocation and subscription facts from the Tadawul allotment announcement. Each
// money or count field is null when the company did not disclose it. verified is the
// allocation_verified flag; the UI shows an unverified badge while it is false.
export interface AllocationDetails {
  retailTranchePct: string | null;
  retailSharesOffered: string | null;
  minAllocationShares: string | null;
  individualSubscribersCount: number | null;
  retailCoverageMultiple: string | null;
  institutionalCoverageMultiple: string | null;
  allocationFactor: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  subscriptionDays: number | null; // end - start + 1, inclusive
  sourceUrl: string | null;
  verified: boolean;
  advisors: Advisor[];
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
  // What a minimum-allocation subscriber would hold today, or not computable when no
  // minimum allocation is on record or there is no price to value it.
  retailOutcome: RetailOutcomeResult;
  allocation: AllocationDetails | null;
  tradingSessions: number;
  isNewlyListed: boolean;
}
