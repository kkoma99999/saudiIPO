"""Load offer-price valuation multiples from data/ipo_valuation.csv into ipos.

A targeted loader so the sourced valuations can be applied without a full yfinance
backfill. Mirrors the valuation part of backfill.load_verified_corporate_data: empty
fields land as NULL, only companies already seeded are touched so the FK holds, and
nothing is invented. Run from scripts/ with the venv python:

  python load_valuations.py
"""

import csv
import os

import db

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read_csv(name):
    path = os.path.join(_REPO_ROOT, "data", name)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    conn = db.connect()
    db.assert_schema(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT symbol FROM companies")
        have = {r[0].strip() for r in cur.fetchall()}

    rows = [r for r in _read_csv("ipo_valuation.csv") if r["symbol"].strip() in have]
    filled = 0
    for r in rows:
        eps = (r.get("recurring_eps_ttm") or "").strip()
        bvps = (r.get("book_value_per_share") or "").strip()
        url = (r.get("source_url") or "").strip()
        db.set_valuation(conn, r["symbol"].strip(), eps or None, bvps or None, url or None)
        if eps or bvps:
            filled += 1
    conn.commit()
    db.log_ingest(conn, db.new_run_id(), None, "valuations", "success",
                  f"loaded {len(rows)} valuation rows, {filled} with values", filled)
    print(f"loaded {len(rows)} valuation rows, {filled} with values")
    conn.close()


if __name__ == "__main__":
    main()
