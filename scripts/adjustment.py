"""Pure adjustment and return math for Saudi IPOs.

This module owns no database or network access. It mirrors the TypeScript metrics
module in src/lib/metrics.ts and is tested against the same hand-built bonus case so
the two implementations must agree. See .claude/skills/tadawul-data/SKILL.md.

Money is Decimal, never float. Dates are 'YYYY-MM-DD' strings, which compare
correctly with normal string comparison.

A corporate action factor is the share multiplier: a 1-for-5 bonus is 1.20 (six
shares for every five), a 2-for-1 split is 2.00. yfinance reports the same value for
both, so the math treats split and bonus identically.

The key correctness rule: yfinance dividends are raw, meaning per the share count on
the ex-date and not split-adjusted. Each dividend is divided by the cumulative factor
of actions strictly after its ex-date to express it in current-share terms.
"""

from decimal import Decimal, getcontext

# High working precision so repeating decimals like 10 / 1.2 do not lose accuracy.
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
    """Raw offer price expressed in current shares.

    You paid raw_offer_price for what is now F shares, so per current share you paid
    raw_offer_price / F, where F is the product of all post-IPO action factors.
    """
    return _dec(raw_offer_price) / cumulative_factor_after(actions, ipo_date)


def adjusted_close_as_of(raw_close, as_of_date: str, actions) -> Decimal:
    """Raw close on as_of_date expressed in current shares.

    The latest close needs no adjustment. A close before some actions is multiplied
    forward by the factor of actions after it.
    """
    return _dec(raw_close) * cumulative_factor_after(actions, as_of_date)


def cumulative_adjusted_dividends(dividends, actions, as_of_date: str) -> Decimal:
    """Sum of dividends up to as_of_date, each expressed per current share.

    dividends: iterable of mappings with 'ex_date' (YYYY-MM-DD) and 'amount'.
    """
    total = Decimal(0)
    for dividend in dividends:
        if dividend["ex_date"] <= as_of_date:
            total += _dec(dividend["amount"]) / cumulative_factor_after(
                actions, dividend["ex_date"]
            )
    return total


def price_return(raw_offer_price, ipo_date: str, raw_close, as_of_date: str, actions) -> Decimal:
    """adjusted_close / adjusted_offer_price - 1."""
    aop = adjusted_offer_price(raw_offer_price, ipo_date, actions)
    ac = adjusted_close_as_of(raw_close, as_of_date, actions)
    return ac / aop - 1


def total_return(
    raw_offer_price,
    ipo_date: str,
    raw_close,
    as_of_date: str,
    actions,
    dividends,
) -> Decimal:
    """price_return + cumulative_adjusted_dividends / adjusted_offer_price."""
    aop = adjusted_offer_price(raw_offer_price, ipo_date, actions)
    pr = price_return(raw_offer_price, ipo_date, raw_close, as_of_date, actions)
    cd = cumulative_adjusted_dividends(dividends, actions, as_of_date)
    return pr + cd / aop
