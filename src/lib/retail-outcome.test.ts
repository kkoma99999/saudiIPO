import { describe, it, expect } from "vitest";
import { totalReturn } from "./metrics";
import { outcomeForShares, retailOutcome } from "./retail-outcome";

// Hand-built fixtures with exact expected numbers. The calculator must reuse the
// adjustment engine, so a 1-for-1 bonus doubles the share count and a dividend is
// counted at the share count held on its ex-date. See the tadawul-data skill.

const IPO_DATE = "2020-01-01";
const AS_OF = "2024-01-01";

function compute(over: Partial<Parameters<typeof retailOutcome>[0]> = {}) {
  return retailOutcome({
    offerPrice: 10,
    minAllocationShares: 100,
    ipoDate: IPO_DATE,
    latestClose: 12,
    asOfDate: AS_OF,
    actions: [],
    dividends: [],
    ...over,
  });
}

// The outcome for the minimum allocation, computed the same way the company page does.
function minOutcome(over: Partial<Parameters<typeof retailOutcome>[0]> = {}) {
  const r = compute(over);
  if (!r.computable) throw new Error("expected a computable outcome");
  return outcomeForShares(r.basis, r.basis.minAllocationShares);
}

describe("retail outcome calculator", () => {
  it("1. no corporate actions, no dividends: net is current value minus capital", () => {
    expect(compute().computable).toBe(true);
    const b = minOutcome();
    expect(b.capitalDeployed).toBe(1000); // 100 * 10
    expect(b.currentShares).toBe(100);
    expect(b.bonusIncreasedShares).toBe(false);
    expect(b.currentValue).toBe(1200); // 100 * 12
    expect(b.dividendsReceived).toBe(0);
    expect(b.netSar).toBe(200);
    expect(b.netSar).toBe(b.currentValue - b.capitalDeployed);
    expect(b.returnPct).toBeCloseTo(0.2, 12);
  });

  it("2. a 1-for-1 bonus doubles the shares and valuation stays consistent", () => {
    // After a factor-2 bonus the current-share-basis close halves to 6, so the position
    // is still worth 100 * 10 * 1.2 = 1200 and the return is unchanged.
    const b = minOutcome({ actions: [{ actionDate: "2021-06-01", factor: 2 }], latestClose: 6 });
    expect(b.currentShares).toBe(200); // doubled
    expect(b.bonusIncreasedShares).toBe(true);
    expect(b.currentValue).toBe(1200); // 200 * 6
    expect(b.capitalDeployed).toBe(1000);
    expect(b.netSar).toBe(200);
    expect(b.returnPct).toBeCloseTo(0.2, 12);
  });

  it("3. a dividend before a bonus and one after use the right share count at each ex-date", () => {
    const actions = [{ actionDate: "2021-06-01", factor: 2 }];
    const dividends = [
      { exDate: "2021-01-01", amount: 1.0 }, // before the bonus: 100 shares held -> 100
      { exDate: "2022-01-01", amount: 0.5 }, // after the bonus: 200 shares held -> 100
    ];
    const b = minOutcome({ actions, dividends, latestClose: 6 });
    expect(b.currentShares).toBe(200);
    // 100 (pre-bonus) + 100 (post-bonus) = 200, computed via current-share basis.
    expect(b.dividendsReceived).toBeCloseTo(200, 9);
    expect(b.netSar).toBeCloseTo(400, 9); // 1200 + 200 - 1000
    // returnPct must equal the engine's total_return for the same inputs.
    const tr = totalReturn(10, IPO_DATE, 6, AS_OF, actions, dividends).toNumber();
    expect(b.returnPct).toBeCloseTo(tr, 12);
  });

  it("4. a null minimum allocation is not computable and computes nothing", () => {
    const r = compute({ minAllocationShares: null });
    expect(r.computable).toBe(false);
    expect(r).not.toHaveProperty("basis");
  });

  it("5. with dividends, net exceeds the price-only result by exactly the dividends received", () => {
    const baseInputs = { actions: [{ actionDate: "2021-06-01", factor: 2 }], latestClose: 6 };
    const priceOnly = minOutcome(baseInputs);
    const withDiv = minOutcome({ ...baseInputs, dividends: [{ exDate: "2022-01-01", amount: 0.5 }] });
    expect(withDiv.dividendsReceived).toBeCloseTo(100, 9); // 200 shares * 0.50
    expect(withDiv.netSar - priceOnly.netSar).toBeCloseTo(withDiv.dividendsReceived, 9);
  });

  it("scales linearly for a user-entered allocation, leaving the return unchanged", () => {
    const r = compute();
    expect(r.computable).toBe(true);
    if (!r.computable) return;
    const min = outcomeForShares(r.basis, r.basis.minAllocationShares);
    const bigger = outcomeForShares(r.basis, 250);
    expect(bigger.capitalDeployed).toBe(2500); // 250 * 10
    expect(bigger.currentValue).toBe(3000); // 250 * 12
    expect(bigger.netSar).toBe(500);
    expect(bigger.returnPct).toBeCloseTo(min.returnPct, 12);
  });
});
