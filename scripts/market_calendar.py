"""Saudi market trading calendar helper.

The Saudi Main Market trades Sunday through Thursday. Friday and Saturday are the
weekend. This module is named market_calendar to avoid shadowing the Python standard
library 'calendar' module, which yfinance and pandas import.

This covers the weekly cycle only. Official market holidays are not encoded here; a
holiday simply shows up as a day with no price row from the source, which the
ingester records rather than invents.
"""

from datetime import date

# Python date.weekday(): Monday is 0 through Sunday is 6.
_WEEKEND = (4, 5)  # Friday, Saturday


def is_trading_day(d: date) -> bool:
    """True if d is Sunday through Thursday, False on Friday or Saturday."""
    return d.weekday() not in _WEEKEND
