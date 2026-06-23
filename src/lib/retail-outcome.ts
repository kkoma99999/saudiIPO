// What a retail subscriber who received the minimum allocation would have today.
//
// Pure, no IO. It owns no return or adjustment math: it composes the tested functions
// in metrics.ts so a bonus, split, or dividend is handled exactly once, in one place.
// See .claude/skills/tadawul-data/SKILL.md and src/lib/metrics.ts.
//
// The allocation is in ORIGINAL (IPO-date) share basis. F = cumulativeFactorAfter
// converts it to current shares (originalShares * F), because a bonus or split
// multiplies the share count. The stored latest close is already in current-share
// basis, so current value is currentShares * latestClose. Dividends received reuse the
// per-current-share cumulative dividend term and multiply by current shares, which is
// algebraically the same as summing sharesHeldAtEachExDate * dividendPerShareAsPaid.
//
// returnPct equals the company's total_return: the percentage is independent of how
// many shares you hold, only the SAR figures scale with the allocation. Money stays in
// Decimal until the final view model, where each leaf becomes a number for display.

import Decimal from "decimal.js";
import {
  cumulativeAdjustedDividends,
  cumulativeFactorAfter,
  dec,
  type CorporateAction,
  type DividendEvent,
  type Num,
} from "./metrics";

// The five scalars needed to value any allocation size. Serializable (all strings) so
// it crosses to the client, where the optional "actual shares" input recomputes through
// outcomeForShares without shipping the full price, dividend, and action arrays.
export interface OutcomeBasis {
  offerPrice: string;
  cumulativeFactor: string;
  latestClose: string;
  dividendsPerCurrentShare: string;
  minAllocationShares: string;
}

// Display-ready outcome. SAR amounts and the return ratio as numbers; format at render.
export interface RetailOutcome {
  shares: number;
  capitalDeployed: number;
  currentShares: number;
  bonusIncreasedShares: boolean;
  currentValue: number;
  dividendsReceived: number;
  netSar: number;
  returnPct: number;
}

export interface RetailOutcomeInput {
  offerPrice: Num;
  minAllocationShares: Num | null;
  ipoDate: string;
  latestClose: Num | null;
  asOfDate: string | null;
  actions: CorporateAction[];
  dividends: DividendEvent[];
}

export type RetailOutcomeResult =
  | { computable: false }
  | { computable: true; basis: OutcomeBasis };

// How many shares a subscription of amountSar would actually be allotted. Saudi retail
// allotment gives every subscriber the guaranteed minimum allocation first, then fills the
// shares requested ABOVE the minimum at the allocation factor (the published pro-rata rate
// on the remaining shares). So allotted = min(requested, minimum + (requested - minimum) *
// factor), where requested = floor(amountSar / offerPrice) and allocationFactorPercent is a
// percent (0.022 means 0.022 percent of the remainder was filled, 100 means it was filled in
// full). Returns null when it cannot be known: no allocation factor on record, a non-positive
// offer price, or a subscription too small to clear one whole share.
export function allocatedShares(input: {
  amountSar: Num;
  offerPrice: Num;
  allocationFactorPercent: Num | null;
  minAllocationShares: Num | null;
}): Decimal | null {
  if (input.allocationFactorPercent === null) return null;
  const offer = dec(input.offerPrice);
  if (offer.lte(0)) return null;
  const requested = dec(input.amountSar).div(offer).floor();
  if (requested.lte(0)) return null;
  const min = input.minAllocationShares === null ? new Decimal(0) : dec(input.minAllocationShares);
  const base = Decimal.min(min, requested); // the guaranteed minimum, never more than requested
  const extra = Decimal.max(0, requested.minus(min)); // shares requested above the minimum
  const prorata = extra.mul(dec(input.allocationFactorPercent)).div(100);
  const allotted = Decimal.min(requested, base.plus(prorata)).floor();
  return allotted.lte(0) ? null : allotted;
}

// Value a given number of allocated shares against the basis. Linear in shares, so the
// client uses it to recompute for a user-entered allocation. Returns Decimal-exact math
// reduced to numbers only at the leaves.
export function outcomeForShares(basis: OutcomeBasis, shares: Num): RetailOutcome {
  const s = dec(shares);
  const f = dec(basis.cumulativeFactor);

  const capitalDeployed = s.mul(dec(basis.offerPrice));
  const currentShares = s.mul(f);
  const currentValue = currentShares.mul(dec(basis.latestClose));
  const dividendsReceived = currentShares.mul(dec(basis.dividendsPerCurrentShare));
  const netSar = currentValue.add(dividendsReceived).minus(capitalDeployed);
  const returnPct = capitalDeployed.isZero()
    ? new Decimal(0)
    : netSar.div(capitalDeployed);

  return {
    shares: s.toNumber(),
    capitalDeployed: capitalDeployed.toNumber(),
    currentShares: currentShares.toNumber(),
    bonusIncreasedShares: f.gt(1),
    currentValue: currentValue.toNumber(),
    dividendsReceived: dividendsReceived.toNumber(),
    netSar: netSar.toNumber(),
    returnPct: returnPct.toNumber(),
  };
}

// Build the basis from an IPO and its market data, defaulting to the minimum allocation.
// Not computable without a disclosed minimum allocation or a latest price to value it;
// the caller then shows the not-disclosed state and no numbers.
export function retailOutcome(input: RetailOutcomeInput): RetailOutcomeResult {
  const { offerPrice, minAllocationShares, ipoDate, latestClose, asOfDate, actions, dividends } =
    input;

  if (minAllocationShares === null || latestClose === null || asOfDate === null) {
    return { computable: false };
  }
  const minShares = dec(minAllocationShares);
  if (minShares.lte(0)) return { computable: false };

  const basis: OutcomeBasis = {
    offerPrice: dec(offerPrice).toString(),
    cumulativeFactor: cumulativeFactorAfter(actions, ipoDate).toString(),
    latestClose: dec(latestClose).toString(),
    dividendsPerCurrentShare: cumulativeAdjustedDividends(dividends, actions, asOfDate).toString(),
    minAllocationShares: minShares.toString(),
  };

  return { computable: true, basis };
}
