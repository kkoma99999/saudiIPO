// Pure return and adjustment math. No database or network access. This mirrors the
// Python module in scripts/adjustment.py and is tested against the same hand-built
// bonus case so the two implementations must agree. See
// .claude/skills/tadawul-data/SKILL.md.
//
// Money stays in Decimal, never JS number, until the final formatted display. Inputs
// that come from the database arrive as numeric strings; pass them straight in.
// Dates are 'YYYY-MM-DD' strings, which compare correctly with normal comparison.

import Decimal from "decimal.js";

Decimal.set({ precision: 50 });

export type Num = string | number;

export interface CorporateAction {
  actionDate: string; // YYYY-MM-DD
  factor: Num; // share multiplier: 1-for-5 bonus is 1.20, 2-for-1 split is 2.00
}

export interface DividendEvent {
  exDate: string; // YYYY-MM-DD
  amount: Num; // raw per-share cash dividend in SAR
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

// Raw offer price expressed in current shares.
export function adjustedOfferPrice(
  rawOfferPrice: Num,
  ipoDate: string,
  actions: CorporateAction[],
): Decimal {
  return dec(rawOfferPrice).div(cumulativeFactorAfter(actions, ipoDate));
}

// Raw close on asOfDate expressed in current shares. The latest close needs no
// adjustment; an earlier close is multiplied forward by the factor of later actions.
export function adjustedCloseAsOf(
  rawClose: Num,
  asOfDate: string,
  actions: CorporateAction[],
): Decimal {
  return dec(rawClose).mul(cumulativeFactorAfter(actions, asOfDate));
}

// Sum of dividends up to asOfDate, each expressed per current share. yfinance
// dividends are raw, so each is divided by the cumulative factor after its ex-date.
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

// adjusted_close / adjusted_offer_price - 1
export function priceReturn(
  rawOfferPrice: Num,
  ipoDate: string,
  rawClose: Num,
  asOfDate: string,
  actions: CorporateAction[],
): Decimal {
  const aop = adjustedOfferPrice(rawOfferPrice, ipoDate, actions);
  const ac = adjustedCloseAsOf(rawClose, asOfDate, actions);
  return ac.div(aop).minus(1);
}

// price_return + cumulative_adjusted_dividends / adjusted_offer_price
export function totalReturn(
  rawOfferPrice: Num,
  ipoDate: string,
  rawClose: Num,
  asOfDate: string,
  actions: CorporateAction[],
  dividends: DividendEvent[],
): Decimal {
  const aop = adjustedOfferPrice(rawOfferPrice, ipoDate, actions);
  const pr = priceReturn(rawOfferPrice, ipoDate, rawClose, asOfDate, actions);
  const cd = cumulativeAdjustedDividends(dividends, actions, asOfDate);
  return pr.add(cd.div(aop));
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
