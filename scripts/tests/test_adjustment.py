from decimal import Decimal

from adjustment import (
    adjusted_close_as_of,
    adjusted_offer_price,
    cumulative_adjusted_dividends,
    cumulative_factor_after,
    price_return,
    total_return,
)

IPO = "2020-01-01"
ASOF = "2026-06-07"


def q4(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.0001"))


def test_no_actions_no_dividends():
    actions = []
    assert q4(adjusted_offer_price(10, IPO, actions)) == Decimal("10.0000")
    pr = price_return(10, IPO, 12, ASOF, actions)
    assert q4(pr) == Decimal("0.2000")
    tr = total_return(10, IPO, 12, ASOF, actions, [])
    assert q4(tr) == q4(pr)


def test_golden_bonus_1_for_5():
    # The shared golden fixture, also asserted in src/lib/metrics.test.ts.
    # Raw offer 10.00, one 1-for-5 bonus (factor 1.20) after IPO, one 2.00 dividend
    # before the bonus, latest close 9.60.
    actions = [{"action_date": "2021-06-01", "factor": "1.20"}]
    dividends = [{"ex_date": "2020-09-01", "amount": "2.00"}]

    assert q4(adjusted_offer_price("10.00", IPO, actions)) == Decimal("8.3333")
    assert q4(cumulative_adjusted_dividends(dividends, actions, ASOF)) == Decimal("1.6667")
    assert q4(price_return("10.00", IPO, "9.60", ASOF, actions)) == Decimal("0.1520")
    assert q4(total_return("10.00", IPO, "9.60", ASOF, actions, dividends)) == Decimal("0.3520")

    # The forbidden raw view would wrongly show a loss.
    raw_view = Decimal("9.60") / Decimal("10.00") - 1
    assert q4(raw_view) == Decimal("-0.0400")


def test_two_for_one_split():
    actions = [{"action_date": "2021-01-01", "factor": "2.00"}]
    dividends = [{"ex_date": "2020-06-01", "amount": "4.00"}]
    assert q4(adjusted_offer_price(100, IPO, actions)) == Decimal("50.0000")
    assert q4(cumulative_adjusted_dividends(dividends, actions, ASOF)) == Decimal("2.0000")
    assert q4(price_return(100, IPO, 60, ASOF, actions)) == Decimal("0.2000")
    assert q4(total_return(100, IPO, 60, ASOF, actions, dividends)) == Decimal("0.2400")


def test_chained_actions_factor_is_product_order_independent():
    a = [{"action_date": "2021-01-01", "factor": "1.20"}, {"action_date": "2022-01-01", "factor": "2.00"}]
    b = list(reversed(a))
    assert cumulative_factor_after(a, IPO) == Decimal("2.4")
    assert cumulative_factor_after(b, IPO) == Decimal("2.4")
    assert q4(adjusted_offer_price(10, IPO, a)) == Decimal("4.1667")


def test_dividend_after_all_actions_is_unadjusted():
    actions = [{"action_date": "2021-01-01", "factor": "2.00"}]
    dividends = [{"ex_date": "2022-01-01", "amount": "3.00"}]
    assert cumulative_adjusted_dividends(dividends, actions, ASOF) == Decimal("3.00")


def test_dividend_between_two_actions_uses_later_factor_only():
    actions = [{"action_date": "2021-01-01", "factor": "2.00"}, {"action_date": "2023-01-01", "factor": "1.50"}]
    dividends = [{"ex_date": "2022-01-01", "amount": "6.00"}]
    assert q4(cumulative_adjusted_dividends(dividends, actions, ASOF)) == Decimal("4.0000")


def test_mixed_dividends_before_and_after_split():
    actions = [{"action_date": "2021-01-01", "factor": "2.00"}]
    dividends = [
        {"ex_date": "2020-06-01", "amount": "4.00"},  # before split -> /2 = 2.00
        {"ex_date": "2022-06-01", "amount": "3.00"},  # after split  -> /1 = 3.00
    ]
    assert q4(cumulative_adjusted_dividends(dividends, actions, ASOF)) == Decimal("5.0000")


def test_as_of_before_action_multiplies_close_forward():
    actions = [{"action_date": "2023-01-01", "factor": "2.00"}]
    assert q4(adjusted_close_as_of(10, "2022-01-01", actions)) == Decimal("20.0000")
    # On or after the action there is no later action, so no forward multiply.
    assert q4(adjusted_close_as_of(10, "2024-01-01", actions)) == Decimal("10.0000")


def test_no_float_drift():
    actions = [{"action_date": "2021-01-01", "factor": "1.20"}]
    adjusted = adjusted_offer_price(10, IPO, actions)
    # Exact decimal division, not the binary-float result.
    assert adjusted == Decimal("10") / Decimal("1.20")
    fifteen = Decimal("1.000000000000000")
    assert adjusted.quantize(fifteen) != Decimal(str(10 / 1.2)).quantize(fifteen)


def test_zero_dividends_total_equals_price():
    actions = [{"action_date": "2021-01-01", "factor": "1.20"}]
    pr = price_return(10, IPO, 9.6, ASOF, actions)
    tr = total_return(10, IPO, 9.6, ASOF, actions, [])
    assert tr == pr


def test_negative_return_not_clamped():
    pr = price_return(10, IPO, 7, ASOF, [])
    assert pr < 0
    assert q4(pr) == Decimal("-0.3000")
