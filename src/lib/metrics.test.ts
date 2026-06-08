import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  adjustedOfferPrice,
  cagr,
  compareToIndex,
  cumulativeAdjustedDividends,
  cumulativeFactorAfter,
  pctToDps,
  priceReturn,
  totalReturn,
  yearsBetween,
  yieldOnOffer,
  type CorporateAction,
  type DividendEvent,
} from "./metrics";

const IPO = "2020-01-01";
const ASOF = "2026-06-07";
const f4 = (d: Decimal) => d.toFixed(4);

// The six golden fixtures from docs/FINANCE_AUDIT.md, mirrored in
// scripts/tests/test_adjustment.py so both implementations must agree.
describe("golden fixtures", () => {
  it("1. no corporate actions: returns and dividends straight through", () => {
    const actions: CorporateAction[] = [];
    const divs: DividendEvent[] = [{ exDate: "2020-06-01", amount: "2" }];
    expect(f4(adjustedOfferPrice(50, IPO, actions))).toBe("50.0000");
    expect(f4(priceReturn(50, IPO, 60, actions))).toBe("0.2000");
    expect(f4(cumulativeAdjustedDividends(divs, actions, ASOF))).toBe("2.0000");
    expect(f4(totalReturn(50, IPO, 60, ASOF, actions, divs))).toBe("0.2400");
  });

  it("2. 1-for-1 bonus (factor 2): offer 50 to 25, pre-bonus dividend halves", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "2" }];
    const divs: DividendEvent[] = [{ exDate: "2020-06-01", amount: "4" }];
    expect(f4(adjustedOfferPrice(50, IPO, actions))).toBe("25.0000");
    expect(f4(cumulativeAdjustedDividends(divs, actions, ASOF))).toBe("2.0000");
    expect(f4(priceReturn(50, IPO, 30, actions))).toBe("0.2000");
    expect(f4(totalReturn(50, IPO, 30, ASOF, actions, divs))).toBe("0.2800");
  });

  it("3. par change 10 to 1 (factor 10) then a 1.2 bonus: cumulative factor 12", () => {
    const actions: CorporateAction[] = [
      { actionDate: "2021-01-01", factor: "10" },
      { actionDate: "2022-01-01", factor: "1.2" },
    ];
    expect(cumulativeFactorAfter(actions, IPO).toString()).toBe("12");
    expect(f4(adjustedOfferPrice(100, IPO, actions))).toBe("8.3333");
    expect(f4(priceReturn(100, IPO, 12, actions))).toBe("0.4400");
  });

  it("4. dividend before vs after a bonus: per current-share basis is correct", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-06-01", factor: "1.5" }];
    const divs: DividendEvent[] = [
      { exDate: "2021-01-01", amount: "3" }, // before bonus -> /1.5 = 2.00
      { exDate: "2021-12-01", amount: "3" }, // after bonus  -> /1   = 3.00
    ];
    expect(f4(cumulativeAdjustedDividends(divs, actions, ASOF))).toBe("5.0000");
    expect(f4(adjustedOfferPrice(30, IPO, actions))).toBe("20.0000");
    expect(f4(totalReturn(30, IPO, 24, ASOF, actions, divs))).toBe("0.4500");
  });

  it("5. percentage dividend conversion: 10% on par 10 is 1.00 SAR", () => {
    expect(pctToDps(10, 10).toFixed(2)).toBe("1.00");
    expect(pctToDps(5, 10).toFixed(2)).toBe("0.50");
    expect(pctToDps(10, 1).toFixed(2)).toBe("0.10");
  });

  it("6. total equals price with zero dividends, else exactly + cum_div/adj_offer", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "2" }];
    const pr = priceReturn(50, IPO, 30, actions);
    expect(totalReturn(50, IPO, 30, ASOF, actions, []).equals(pr)).toBe(true);

    const divs: DividendEvent[] = [{ exDate: "2020-06-01", amount: "4" }];
    const tr = totalReturn(50, IPO, 30, ASOF, actions, divs);
    const aop = adjustedOfferPrice(50, IPO, actions);
    const cd = cumulativeAdjustedDividends(divs, actions, ASOF);
    expect(tr.minus(pr).toFixed(8)).toBe(cd.div(aop).toFixed(8));
  });
});

describe("supporting math", () => {
  it("no float drift in the offer adjustment", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "1.2" }];
    const adjusted = adjustedOfferPrice(10, IPO, actions);
    expect(adjusted.equals(new Decimal("10").div("1.20"))).toBe(true);
    expect(adjusted.toFixed(15)).not.toBe(new Decimal((10 / 1.2).toString()).toFixed(15));
  });

  it("negative price return is not clamped", () => {
    const pr = priceReturn(10, IPO, 7, []);
    expect(pr.lt(0)).toBe(true);
    expect(f4(pr)).toBe("-0.3000");
  });

  it("yield on offer", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-06-01", factor: "1.2" }];
    const aop = adjustedOfferPrice("10.00", IPO, actions);
    const annual = cumulativeAdjustedDividends(
      [{ exDate: "2020-09-01", amount: "2.00" }],
      actions,
      ASOF,
    );
    expect(yieldOnOffer(annual.toString(), aop).toFixed(4)).toBe("0.2000");
  });

  it("cagr cases", () => {
    expect(cagr("0.21", 2)).toBeCloseTo(0.1, 9);
    expect(cagr("0.21", 0.5)).toBeCloseTo(0.4641, 4);
    expect(Number.isNaN(cagr("0.21", 0))).toBe(true);
    expect(cagr("-1.5", 3)).toBe(-1);
  });

  it("yearsBetween counts leap years (ACT/365.25)", () => {
    expect(yearsBetween("2020-01-01", "2024-01-01")).toBeCloseTo(4.0, 5);
  });

  it("compareToIndex alpha and missing-data fallback", () => {
    const cmp = compareToIndex("0.352", 100, 110);
    expect(cmp.tasiReturn.toFixed(4)).toBe("0.1000");
    expect(cmp.alpha.toFixed(4)).toBe("0.2520");
    const miss = compareToIndex("0.352", "", "");
    expect(miss.tasiReturn.isNaN()).toBe(true);
    expect(miss.alpha.isNaN()).toBe(true);
  });
});
