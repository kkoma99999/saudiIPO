"""Pure adjustment and return math for Saudi IPOs.

No database or network access. Mirrors src/lib/metrics.ts and is tested against the
same hand-built fixtures so the two implementations must agree. See
.claude/skills/tadawul-data/SKILL.md and docs/FINANCE_AUDIT.md.

Convention (verified empirically): yfinance is fetched with auto_adjust=False, so the
stored close is SPLIT and bonus adjusted to current-share basis and is NOT dividend
adjusted. We do not re-apply split factors to the close. We only convert the offer
price and the dividends to current-share basis using the verified factor F.

  split_adjusted_offer = offer_price / F(after ipo_date)
  price_return = split_adjusted_close / split_adjusted_offer - 1
  total_return = price_return + cumulative_dividends_per_current_share / split_adjusted_offer

Dividends are never baked into price. Money is Decimal, never float.
"""

from decimal import Decimal, getcontext

getcontext().prec = 50


def _dec(value) -> Decimal:
    """Convert to Decimal via str so floats do not contaminate the value."""
    return Decimal(str(value))


def cumulative_factor_after(actions, after_date: str) -> Decimal:
    """Product of action factors for actions strictly after after_date.

    actions: iterable of mappings with 'action_date' (YYYY-MM-DD) and 'factor'.
    """
    factor = Decimal(1)
    for action in actions:
        if action["action_date"] > after_date:
            factor *= _dec(action["factor"])
    return factor


def adjusted_offer_price(raw_offer_price, ipo_date: str, actions) -> Decimal:
    """Offer price converted to current-share basis: offer / F(after ipo_date)."""
    return _dec(raw_offer_price) / cumulative_factor_after(actions, ipo_date)


def cumulative_adjusted_dividends(dividends, actions, as_of_date: str) -> Decimal:
    """Sum of dividends up to as_of_date, each converted to current-share basis.

    yfinance dividends are raw (per the share count on the ex-date), so each is
    divided by the factor of actions strictly after its ex-date.
    """
    total = Decimal(0)
    for dividend in dividends:
        if dividend["ex_date"] <= as_of_date:
            total += _dec(dividend["amount"]) / cumulative_factor_after(
                actions, dividend["ex_date"]
            )
    return total


def price_return(raw_offer_price, ipo_date: str, split_adjusted_close, actions) -> Decimal:
    """split_adjusted_close / split_adjusted_offer - 1. The close is already split
    adjusted by yfinance, so it is used as is."""
    return _dec(split_adjusted_close) / adjusted_offer_price(raw_offer_price, ipo_date, actions) - 1


def total_return(
    raw_offer_price,
    ipo_date: str,
    split_adjusted_close,
    as_of_date: str,
    actions,
    dividends,
) -> Decimal:
    """price_return + cumulative_dividends_per_current_share / split_adjusted_offer."""
    aop = adjusted_offer_price(raw_offer_price, ipo_date, actions)
    pr = price_return(raw_offer_price, ipo_date, split_adjusted_close, actions)
    cd = cumulative_adjusted_dividends(dividends, actions, as_of_date)
    return pr + cd / aop


def pct_to_dps(pct, nominal_value) -> Decimal:
    """A dividend quoted as a percentage is a percentage of par (nominal) value at
    that date: dps = pct/100 * nominal. For example 10% on par 10 is 1.00 SAR."""
    return _dec(pct) / 100 * _dec(nominal_value)
