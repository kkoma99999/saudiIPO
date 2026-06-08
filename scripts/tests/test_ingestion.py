from backfill import dedupe_splits
from validate_dividends import looks_like_percentage


def test_dedupe_consecutive_duplicate_par_split():
    # Two factor-10 events one day apart collapse to one (the BinDawood/Alsaif case).
    raw = [("2023-07-02", 10.0), ("2023-07-03", 10.0)]
    assert dedupe_splits(raw) == [("2023-07-02", 10.0)]


def test_dedupe_keeps_distinct_events():
    # Aramco-style: two real bonuses far apart stay; a same-week duplicate collapses.
    raw = [("2020-06-04", 1.1), ("2020-06-08", 1.1), ("2022-05-15", 1.1), ("2023-05-09", 1.1)]
    assert dedupe_splits(raw) == [("2020-06-04", 1.1), ("2022-05-15", 1.1), ("2023-05-09", 1.1)]


def test_dedupe_keeps_different_factors_same_window():
    raw = [("2023-06-01", 10.0), ("2023-06-02", 2.0)]
    assert dedupe_splits(raw) == [("2023-06-01", 10.0), ("2023-06-02", 2.0)]


def test_looks_like_percentage():
    # 10 stored on par 10 looks like a percentage (10% should be 1.00 SAR).
    assert looks_like_percentage(10, 10) is True
    assert looks_like_percentage(5, 10) is True
    # A real per-share dividend is not flagged.
    assert looks_like_percentage("1.00", 10) is False
    assert looks_like_percentage("0.45", 10) is False
    assert looks_like_percentage("2.50", 10) is False
    # No nominal known: cannot judge, not flagged.
    assert looks_like_percentage(10, None) is False
