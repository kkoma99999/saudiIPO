"""Apply data/allocations.csv and data/ipo_advisors.csv without a full yfinance backfill.

A thin entrypoint over db.load_allocations and db.load_advisors (the shared loaders used
by backfill too), so the sourced allocation facts and advisor rosters can be refreshed on
their own. Run from scripts/ with the venv python:  python load_allocations.py
"""

import db


def main():
    conn = db.connect()
    db.assert_schema(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT symbol FROM companies")
        have = {r[0].strip() for r in cur.fetchall()}

    allocations = db.load_allocations(conn, have)
    advisors = db.load_advisors(conn, have)
    conn.commit()
    db.log_ingest(conn, db.new_run_id(), None, "allocations", "success",
                  f"loaded {allocations} allocations, {advisors} advisors", allocations)
    print(f"loaded {allocations} allocations, {advisors} advisors")
    conn.close()


if __name__ == "__main__":
    main()
