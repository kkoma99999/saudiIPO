// Pure return and adjustment math. No database or network access. This mirrors the
// Python module in scripts/adjustment.py and is tested against the same hand-built
// fixtures so the two implementations must agree. See
// .claude/skills/tadawul-data/SKILL.md.
//
// Convention (verified empirically, see docs/FINANCE_AUDIT.md): yfinance is fetched
// with auto_adjust=False, so the stored close is SPLIT and bonus adjusted to
// current-share basis, and is NOT dividend adjusted. We therefore do not re-apply
// split factors to the close. We only convert the offer price and the dividends to
// current-share basis using the verified corporate-action factor F.
//
//   split_adjusted_offer = offer_price / F(after ipo_date)
//   price_return = split_adjusted_close / split_adjusted_offer - 1
//   total_return = price_return + cumulative_dividends_per_current_share / split_adjusted_offer
//
// Dividends are never baked into price; they are always a separate, visible term.
// Money stays in Decimal, never JS number, until the final formatted display.

import Decimal from "decimal.js";

Decimal.set({ precision: 50 });

export type Num = string | number;

export interface CorporateAction {
  actionDate: string; // YYYY-MM-DD
  factor: Num; // share multiplier: 1-for-5 bonus is 1.20, par 10 to 1 is 10
}

export interface DividendEvent {
  exDate: string; // YYYY-MM-DD
  amount: Num; // raw per-share cash dividend in SAR, as paid
}

export interface IndexComparison {
  tasiReturn: Decimal;
  alpha: Decimal;
}

function dec(value: Num): Decimal {
  return new Decimal(typeof value === "number" ? value.toString() : value);
}

// Product of action factors for actions strictly after afterDate.
export function cumulativeFactorAfter(
  actions: CorporateAction[],
  afterDate: string,
): Decimal {
  let factor = new Decimal(1);
  for (const action of actions) {
    if (action.actionDate > afterDate) {
      factor = factor.mul(dec(action.factor));
    }
  }
  return factor;
}

// Offer price converted to current-share basis: offer / F(after ipo_date).
export function adjustedOfferPrice(
  rawOfferPrice: Num,
  ipoDate: string,
  actions: CorporateAction[],
): Decimal {
  return dec(rawOfferPrice).div(cumulativeFactorAfter(actions, ipoDate));
}

// Sum of dividends up to asOfDate, each converted to current-share basis. yfinance
// dividends are raw (per the share count on the ex-date), so each is divided by the
// factor of actions strictly after its ex-date.
export function cumulativeAdjustedDividends(
  dividends: DividendEvent[],
  actions: CorporateAction[],
  asOfDate: string,
): Decimal {
  let total = new Decimal(0);
  for (const dividend of dividends) {
    if (dividend.exDate <= asOfDate) {
      total = total.add(
        dec(dividend.amount).div(cumulativeFactorAfter(actions, dividend.exDate)),
      );
    }
  }
  return total;
}

// split_adjusted_close / split_adjusted_offer - 1. The close is already split
// adjusted by yfinance, so it is used as is.
export function priceReturn(
  rawOfferPrice: Num,
  ipoDate: string,
  splitAdjustedClose: Num,
  actions: CorporateAction[],
): Decimal {
  return dec(splitAdjustedClose)
    .div(adjustedOfferPrice(rawOfferPrice, ipoDate, actions))
    .minus(1);
}

// Trading-day window for the early "listing" return shown next to the offer price.
// The first sessions capture the IPO pop, which on TASI is bounded by the daily price
// limits and settles within a week of trading.
export const EARLY_RETURN_TRADING_DAYS = 5;

// Return from the offer price to the close on an early trading day (for example the
// 5th). The math is identical to priceReturn: the stored early close is already in
// current-share basis, and no corporate action falls inside the first few sessions,
// so F(after ipo) equals F(after that early day) and dividing only the offer by F is
// exact. Were an action ever to land inside the window, this is still a faithful
// current-share comparison of that early close to the offer.
export function earlyTradingReturn(
  rawOfferPrice: Num,
  ipoDate: string,
  earlyClose: Num,
  actions: CorporateAction[],
): Decimal {
  return priceReturn(rawOfferPrice, ipoDate, earlyClose, actions);
}

// The early window is only trustworthy when the price history actually starts at the
// listing. yfinance has gaps on some .SR tickers (for example 4161 BinDawood's data
// begins about six months after its IPO), so the "5th session" can sit far from the
// IPO. We require the data to start within a few days of the IPO and the five sessions
// to span no more than two weeks. When it does not, the early return is left empty
// rather than presenting a much later return as a first-week one.
export const EARLY_RETURN_MAX_START_LAG_DAYS = 5;
export const EARLY_RETURN_MAX_SPAN_DAYS = 14;

function daysBetween(startDate: string, endDate: string): number {
  return Math.round(
    (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) /
      86_400_000,
  );
}

export function earlyWindowIsClean(
  ipoDate: string,
  firstSessionDate: string,
  fifthSessionDate: string,
): boolean {
  return (
    daysBetween(ipoDate, firstSessionDate) <= EARLY_RETURN_MAX_START_LAG_DAYS &&
    daysBetween(ipoDate, fifthSessionDate) <= EARLY_RETURN_MAX_SPAN_DAYS
  );
}

// price_return + cumulative_dividends_per_current_share / split_adjusted_offer.
export function totalReturn(
  rawOfferPrice: Num,
  ipoDate: string,
  splitAdjustedClose: Num,
  asOfDate: string,
  actions: CorporateAction[],
  dividends: DividendEvent[],
): Decimal {
  const aop = adjustedOfferPrice(rawOfferPrice, ipoDate, actions);
  const pr = priceReturn(rawOfferPrice, ipoDate, splitAdjustedClose, actions);
  const cd = cumulativeAdjustedDividends(dividends, actions, asOfDate);
  return pr.add(cd.div(aop));
}

// A dividend quoted as a percentage is a percentage of the par (nominal) value at
// that date: dps = pct/100 * nominal. For example 10% on par 10 is 1.00 SAR.
export function pctToDps(pct: Num, nominalValue: Num): Decimal {
  return dec(pct).div(100).mul(dec(nominalValue));
}

// Annual dividends per current share divided by the adjusted offer price.
export function yieldOnOffer(
  annualDividendsPerCurrentShare: Num,
  adjustedOffer: Decimal,
): Decimal {
  return dec(annualDividendsPerCurrentShare).div(adjustedOffer);
}

// Year fraction between two dates, ACT/365.25.
export function yearsBetween(startDate: string, endDate: string): number {
  const start = Date.parse(startDate + "T00:00:00Z");
  const end = Date.parse(endDate + "T00:00:00Z");
  const days = (end - start) / (1000 * 60 * 60 * 24);
  return days / 365.25;
}

// (1 + total_return) ^ (1 / years) - 1. Returns NaN when years <= 0 and -1 (total
// loss) when the value base is non-positive, so no complex result is produced.
export function cagr(totalReturnRatio: Num | Decimal, years: number): number {
  if (years <= 0) return NaN;
  const base = (totalReturnRatio instanceof Decimal
    ? totalReturnRatio
    : dec(totalReturnRatio)
  ).add(1);
  if (base.lte(0)) return -1;
  return base.pow(new Decimal(1).div(years)).minus(1).toNumber();
}

// Same-window TASI comparison. The index needs no adjustment. Returns NaN-bearing
// Decimals when index data is missing, so the metric degrades rather than crashing.
export function compareToIndex(
  stockTotalReturn: Num | Decimal,
  tasiStartClose: Num | "",
  tasiEndClose: Num | "",
): IndexComparison {
  if (tasiStartClose === "" || tasiEndClose === "") {
    return { tasiReturn: new Decimal(NaN), alpha: new Decimal(NaN) };
  }
  const start = dec(tasiStartClose);
  const end = dec(tasiEndClose);
  const tasiReturn = end.div(start).minus(1);
  const stock =
    stockTotalReturn instanceof Decimal ? stockTotalReturn : dec(stockTotalReturn);
  return { tasiReturn, alpha: stock.minus(tasiReturn) };
}
