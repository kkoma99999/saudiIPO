"""Re-apply the data/ CSV metadata to the DB without a yfinance backfill.

Updates the company and ipo core fields (name_ar, sector, proceeds_sar,
oversubscription, shares_offered, nominal_value) plus valuations, allocations,
advisors, corporate actions, and caveats, so edits to the data CSVs show up in
the app without re-pulling prices or dividends. Idempotent (all upserts).

Run from scripts/ with the venv python:  python reseed_metadata.py
"""

import csv
import os

import db

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read(name):
    path = os.path.join(_REPO_ROOT, "data", name)
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    conn = db.connect()
    db.assert_schema(conn)
    run_id = db.new_run_id()

    ipos = _read("ipos.csv")
    for r in ipos:
        sym = r["symbol"].strip()
        db.upsert_company(conn, sym, r.get("name_en") or sym,
                          r.get("name_ar"), r.get("sector"), sym + ".SR")
        if (r.get("offer_price") or "").strip() and (r.get("ipo_date") or "").strip():
            db.upsert_ipo(
                conn, sym, r.get("offer_price"), r.get("shares_offered") or None,
                r.get("proceeds_sar"), r.get("oversubscription"), r.get("ipo_date"),
                r.get("source_url") or "", str(r.get("verified")).lower() == "true",
            )
    conn.commit()

    have = {r["symbol"].strip() for r in ipos}
    for r in _read("nominal_values.csv"):
        if r["symbol"].strip() in have:
            db.set_nominal(conn, r["symbol"].strip(), r["nominal_value"])
    actions = [
        (r["symbol"], r["action_date"], r["kind"], r["factor"],
         r.get("ratio_text"), r.get("source_url"), r.get("verified"))
        for r in _read("corporate_actions.csv") if r["symbol"].strip() in have
    ]
    db.upsert_actions(conn, actions)
    for r in _read("data_caveats.csv"):
        if r["symbol"].strip() in have:
            db.set_data_caveat(conn, r["symbol"].strip(), r.get("caveat"))
    nv = db.load_valuations(conn, have)
    nal = db.load_allocations(conn, have)
    nadv = db.load_advisors(conn, have)
    conn.commit()

    db.log_ingest(conn, run_id, None, "reseed_metadata", "success",
                  f"reseeded {len(ipos)} ipos, {nv} valuations, {nal} allocations, "
                  f"{nadv} advisors", len(ipos))
    print(f"reseeded {len(ipos)} ipos metadata; {nal} allocations, {nadv} advisors, "
          f"{nv} valuations")
    conn.close()


if __name__ == "__main__":
    main()
