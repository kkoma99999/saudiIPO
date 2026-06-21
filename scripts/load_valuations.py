"""Apply data/ipo_valuation.csv to the ipos table without a full yfinance backfill.

A thin entrypoint over db.load_valuations (the shared loader used by backfill too), so
the sourced offer-price per-share figures can be refreshed on their own. Run from
scripts/ with the venv python:  python load_valuations.py
"""

import db


def main():
    conn = db.connect()
    db.assert_schema(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT symbol FROM companies")
        have = {r[0].strip() for r in cur.fetchall()}

    filled = db.load_valuations(conn, have)
    conn.commit()
    db.log_ingest(conn, db.new_run_id(), None, "valuations", "success",
                  f"loaded valuations, {filled} with values", filled)
    print(f"loaded valuations, {filled} with values")
    conn.close()


if __name__ == "__main__":
    main()
