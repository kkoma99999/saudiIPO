from decimal import Decimal

from adjustment import (
    adjusted_offer_price,
    cumulative_adjusted_dividends,
    cumulative_factor_after,
    pct_to_dps,
    price_return,
    total_return,
)

IPO = "2020-01-01"
ASOF = "2026-06-07"


def q4(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.0001"))


# The six golden fixtures, mirrored in src/lib/metrics.test.ts. Both must agree.

def test_1_no_actions_straight_through():
    actions = []
    divs = [{"ex_date": "2020-06-01", "amount": "2"}]
    assert q4(adjusted_offer_price(50, IPO, actions)) == Decimal("50.0000")
    assert q4(price_return(50, IPO, 60, actions)) == Decimal("0.2000")
    assert q4(cumulative_adjusted_dividends(divs, actions, ASOF)) == Decimal("2.0000")
    assert q4(total_return(50, IPO, 60, ASOF, actions, divs)) == Decimal("0.2400")


def test_2_one_for_one_bonus_factor_2():
    actions = [{"action_date": "2021-01-01", "factor": "2"}]
    divs = [{"ex_date": "2020-06-01", "amount": "4"}]
    assert q4(adjusted_offer_price(50, IPO, actions)) == Decimal("25.0000")
    assert q4(cumulative_adjusted_dividends(divs, actions, ASOF)) == Decimal("2.0000")
    assert q4(price_return(50, IPO, 30, actions)) == Decimal("0.2000")
    assert q4(total_return(50, IPO, 30, ASOF, actions, divs)) == Decimal("0.2800")


def test_3_par_change_10_then_bonus_factor_12():
    actions = [
        {"action_date": "2021-01-01", "factor": "10"},
        {"action_date": "2022-01-01", "factor": "1.2"},
    ]
    assert cumulative_factor_after(actions, IPO) == Decimal("12")
    assert q4(adjusted_offer_price(100, IPO, actions)) == Decimal("8.3333")
    assert q4(price_return(100, IPO, 12, actions)) == Decimal("0.4400")


def test_4_dividend_before_and_after_bonus():
    actions = [{"action_date": "2021-06-01", "factor": "1.5"}]
    divs = [
        {"ex_date": "2021-01-01", "amount": "3"},  # before -> /1.5 = 2.00
        {"ex_date": "2021-12-01", "amount": "3"},  # after  -> /1   = 3.00
    ]
    assert q4(cumulative_adjusted_dividends(divs, actions, ASOF)) == Decimal("5.0000")
    assert q4(adjusted_offer_price(30, IPO, actions)) == Decimal("20.0000")
    assert q4(total_return(30, IPO, 24, ASOF, actions, divs)) == Decimal("0.4500")


def test_5_percentage_dividend_conversion():
    assert pct_to_dps(10, 10).quantize(Decimal("0.01")) == Decimal("1.00")
    assert pct_to_dps(5, 10).quantize(Decimal("0.01")) == Decimal("0.50")
    assert pct_to_dps(10, 1).quantize(Decimal("0.01")) == Decimal("0.10")


def test_6_total_vs_price_relationship():
    actions = [{"action_date": "2021-01-01", "factor": "2"}]
    pr = price_return(50, IPO, 30, actions)
    assert total_return(50, IPO, 30, ASOF, actions, []) == pr

    divs = [{"ex_date": "2020-06-01", "amount": "4"}]
    tr = total_return(50, IPO, 30, ASOF, actions, divs)
    aop = adjusted_offer_price(50, IPO, actions)
    cd = cumulative_adjusted_dividends(divs, actions, ASOF)
    assert (tr - pr).quantize(Decimal("0.00000001")) == (cd / aop).quantize(Decimal("0.00000001"))


def test_no_float_drift():
    actions = [{"action_date": "2021-01-01", "factor": "1.20"}]
    adjusted = adjusted_offer_price(10, IPO, actions)
    assert adjusted == Decimal("10") / Decimal("1.20")
    fifteen = Decimal("1.000000000000000")
    assert adjusted.quantize(fifteen) != Decimal(str(10 / 1.2)).quantize(fifteen)


def test_negative_return_not_clamped():
    pr = price_return(10, IPO, 7, [])
    assert pr < 0
    assert q4(pr) == Decimal("-0.3000")
