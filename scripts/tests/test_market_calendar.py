from datetime import date

from market_calendar import is_trading_day


def test_full_week():
    # 2024-01-01 is a Monday. Walk the week.
    assert is_trading_day(date(2024, 1, 1)) is True   # Monday
    assert is_trading_day(date(2024, 1, 2)) is True   # Tuesday
    assert is_trading_day(date(2024, 1, 3)) is True   # Wednesday
    assert is_trading_day(date(2024, 1, 4)) is True   # Thursday
    assert is_trading_day(date(2024, 1, 5)) is False  # Friday (weekend)
    assert is_trading_day(date(2024, 1, 6)) is False  # Saturday (weekend)
    assert is_trading_day(date(2024, 1, 7)) is True   # Sunday
