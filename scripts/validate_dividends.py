"""Flag dividends that look like a percentage of par rather than SAR per share.

The dividends table must store SAR per share as actually paid, never a percentage.
yfinance gives cash SAR amounts, so a clean run flags nothing. This guards against a
manual entry that pasted a percentage (for example 10 for 10% of par 10, where the
correct stored value is 1.00 SAR). Informational: prints any flagged rows, exits 0.
"""

from decimal import Decimal

import db

ROUND_PCTS = {Decimal(p) for p in (5, 10, 15, 20, 25, 30, 40, 50, 75, 100)}


def looks_like_percentage(amount, nominal) -> bool:
    """True if the stored amount looks like a round percentage figure rather than a
    SAR-per-share dividend: a round-percent integer that is also at least half of par.
    A real dividend of 1.00 SAR on par 10 is not flagged; a stored 10 (the percentage)
    would be.
    """
    if amount is None or nominal is None:
        return False
    a = Decimal(str(amount))
    n = Decimal(str(nominal))
    if n == 0:
        return False
    return a in ROUND_PCTS and a >= n / 2


def main():
    conn = db.connect()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT d.symbol, d.ex_date, d.amount, i.nominal_value
            FROM dividends d
            JOIN ipos i ON i.symbol = d.symbol
            WHERE i.nominal_value IS NOT NULL
            ORDER BY d.symbol, d.ex_date
            """
        )
        rows = cur.fetchall()
    conn.close()

    flagged = [r for r in rows if looks_like_percentage(r[2], r[3])]
    print(f"Checked {len(rows)} dividends with a known nominal value.")
    if not flagged:
        print("No dividend looks like a percentage. Clean.")
        return
    print(f"FLAGGED {len(flagged)} dividends that may be a percentage of par:")
    for sym, ex, amt, nom in flagged:
        print(f"  {sym} {ex}: amount {amt} vs par {nom} (would be {Decimal(str(amt)) / 100 * Decimal(str(nom))} SAR if a percentage)")


if __name__ == "__main__":
    main()
