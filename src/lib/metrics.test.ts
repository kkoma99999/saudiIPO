import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  adjustedCloseAsOf,
  adjustedOfferPrice,
  cagr,
  compareToIndex,
  cumulativeAdjustedDividends,
  cumulativeFactorAfter,
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

describe("adjustment", () => {
  it("no actions and no dividends", () => {
    const actions: CorporateAction[] = [];
    expect(f4(adjustedOfferPrice(10, IPO, actions))).toBe("10.0000");
    const pr = priceReturn(10, IPO, 12, ASOF, actions);
    expect(f4(pr)).toBe("0.2000");
    expect(f4(totalReturn(10, IPO, 12, ASOF, actions, []))).toBe(f4(pr));
  });

  it("golden 1-for-5 bonus (matches scripts/tests/test_adjustment.py)", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-06-01", factor: "1.20" }];
    const dividends: DividendEvent[] = [{ exDate: "2020-09-01", amount: "2.00" }];

    expect(f4(adjustedOfferPrice("10.00", IPO, actions))).toBe("8.3333");
    expect(f4(cumulativeAdjustedDividends(dividends, actions, ASOF))).toBe("1.6667");
    expect(f4(priceReturn("10.00", IPO, "9.60", ASOF, actions))).toBe("0.1520");
    expect(f4(totalReturn("10.00", IPO, "9.60", ASOF, actions, dividends))).toBe("0.3520");

    // The forbidden raw view would wrongly show a loss.
    const rawView = new Decimal("9.60").div("10.00").minus(1);
    expect(f4(rawView)).toBe("-0.0400");
  });

  it("2-for-1 split", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "2.00" }];
    const dividends: DividendEvent[] = [{ exDate: "2020-06-01", amount: "4.00" }];
    expect(f4(adjustedOfferPrice(100, IPO, actions))).toBe("50.0000");
    expect(f4(cumulativeAdjustedDividends(dividends, actions, ASOF))).toBe("2.0000");
    expect(f4(priceReturn(100, IPO, 60, ASOF, actions))).toBe("0.2000");
    expect(f4(totalReturn(100, IPO, 60, ASOF, actions, dividends))).toBe("0.2400");
  });

  it("chained actions: factor is the product and order independent", () => {
    const a: CorporateAction[] = [
      { actionDate: "2021-01-01", factor: "1.20" },
      { actionDate: "2022-01-01", factor: "2.00" },
    ];
    const b = [...a].reverse();
    expect(cumulativeFactorAfter(a, IPO).toString()).toBe("2.4");
    expect(cumulativeFactorAfter(b, IPO).toString()).toBe("2.4");
    expect(f4(adjustedOfferPrice(10, IPO, a))).toBe("4.1667");
  });

  it("dividend after all actions is unadjusted", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "2.00" }];
    const dividends: DividendEvent[] = [{ exDate: "2022-01-01", amount: "3.00" }];
    expect(cumulativeAdjustedDividends(dividends, actions, ASOF).toString()).toBe("3");
  });

  it("dividend between two actions uses the later factor only", () => {
    const actions: CorporateAction[] = [
      { actionDate: "2021-01-01", factor: "2.00" },
      { actionDate: "2023-01-01", factor: "1.50" },
    ];
    const dividends: DividendEvent[] = [{ exDate: "2022-01-01", amount: "6.00" }];
    expect(f4(cumulativeAdjustedDividends(dividends, actions, ASOF))).toBe("4.0000");
  });

  it("mixed dividends before and after a split", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "2.00" }];
    const dividends: DividendEvent[] = [
      { exDate: "2020-06-01", amount: "4.00" },
      { exDate: "2022-06-01", amount: "3.00" },
    ];
    expect(f4(cumulativeAdjustedDividends(dividends, actions, ASOF))).toBe("5.0000");
  });

  it("as-of before an action multiplies the close forward", () => {
    const actions: CorporateAction[] = [{ actionDate: "2023-01-01", factor: "2.00" }];
    expect(f4(adjustedCloseAsOf(10, "2022-01-01", actions))).toBe("20.0000");
    expect(f4(adjustedCloseAsOf(10, "2024-01-01", actions))).toBe("10.0000");
  });

  it("no float drift", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "1.20" }];
    const adjusted = adjustedOfferPrice(10, IPO, actions);
    expect(adjusted.equals(new Decimal("10").div("1.20"))).toBe(true);
    // The naive binary-float path differs at the fifteenth place.
    expect(adjusted.toFixed(15)).not.toBe(new Decimal((10 / 1.2).toString()).toFixed(15));
  });

  it("zero dividends: total equals price", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-01-01", factor: "1.20" }];
    const pr = priceReturn(10, IPO, 9.6, ASOF, actions);
    const tr = totalReturn(10, IPO, 9.6, ASOF, actions, []);
    expect(tr.equals(pr)).toBe(true);
  });

  it("negative return is not clamped", () => {
    const pr = priceReturn(10, IPO, 7, ASOF, []);
    expect(pr.lt(0)).toBe(true);
    expect(f4(pr)).toBe("-0.3000");
  });
});

describe("yield, cagr, years, index", () => {
  it("yield on offer", () => {
    const actions: CorporateAction[] = [{ actionDate: "2021-06-01", factor: "1.20" }];
    const aop = adjustedOfferPrice("10.00", IPO, actions);
    const annual = cumulativeAdjustedDividends(
      [{ exDate: "2020-09-01", amount: "2.00" }],
      actions,
      ASOF,
    );
    expect(yieldOnOffer(annual.toString(), aop).toFixed(4)).toBe("0.2000");
  });

  it("cagr: 21% over 2 years is 10%", () => {
    expect(cagr("0.21", 2)).toBeCloseTo(0.1, 9);
  });

  it("cagr: sub-year window does not produce NaN", () => {
    const r = cagr("0.21", 0.5);
    expect(Number.isNaN(r)).toBe(false);
    expect(r).toBeCloseTo(0.4641, 4);
  });

  it("cagr: non-positive years is NaN", () => {
    expect(Number.isNaN(cagr("0.21", 0))).toBe(true);
  });

  it("cagr: total loss base is bounded to -1, no complex result", () => {
    expect(cagr("-1.5", 3)).toBe(-1);
  });

  it("yearsBetween: leap years counted, ACT/365.25", () => {
    expect(yearsBetween("2020-01-01", "2024-01-01")).toBeCloseTo(4.0, 5);
  });

  it("compareToIndex: alpha is stock minus index over the same window", () => {
    const cmp = compareToIndex("0.352", 100, 110);
    expect(cmp.tasiReturn.toFixed(4)).toBe("0.1000");
    expect(cmp.alpha.toFixed(4)).toBe("0.2520");
  });

  it("compareToIndex: missing index data degrades to NaN", () => {
    const cmp = compareToIndex("0.352", "", "");
    expect(cmp.tasiReturn.isNaN()).toBe(true);
    expect(cmp.alpha.isNaN()).toBe(true);
  });
});
