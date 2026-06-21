"""Daily live-price sweep from the Sahmk API (https://www.sahmk.sa).

Pulls the latest delayed (or real-time) quote for every company in the database, plus
the TASI index level, and upserts them into live_quotes. This is the dynamic
current-price source: the app prefers it over the yfinance end-of-day close for the
headline current price and the returns, and shows its quote time. Honest by
construction: a failed or empty fetch leaves the existing row untouched and writes an
ingest_log row, and money is parsed as Decimal so no float ever touches a price.

Free-tier Sahmk keys allow 100 requests/day and 10/min, single symbol per request, so
the sweep is throttled (default 6.5s between calls, about 9/min) and stops on a 429 or
when the daily budget is nearly spent. Set SAHMK_API_KEY in .env and never commit it.

Run: python scripts/live_prices.py        (full sweep, all companies + TASI)
     python scripts/live_prices.py --limit 3 --no-index   (smoke test)
"""

import argparse
import json
import sys
import time
import traceback
from datetime import datetime
from decimal import Decimal
from os import environ

import requests

import db

BASE = "https://app.sahmk.sa/api/v1"
SOURCE = "sahmk_quotes"
SOURCE_URL = "https://www.sahmk.sa"
TASI = "TASI"
# Stop with a little headroom rather than spending the very last call of the daily quota.
MIN_REMAINING = 1


def api_key() -> str:
    key = environ.get("SAHMK_API_KEY")
    if not key:
        raise RuntimeError("SAHMK_API_KEY is not set. Add it to .env (never commit it).")
    return key


def get_json(path, key):
    """GET a Sahmk endpoint. Returns (status, body, remaining). Money is parsed as
    Decimal via parse_float, so prices never pass through a float."""
    resp = requests.get(f"{BASE}{path}", headers={"X-API-Key": key}, timeout=20)
    rem = resp.headers.get("X-RateLimit-Remaining")
    remaining = int(rem) if rem and rem.isdigit() else None
    try:
        body = json.loads(resp.text, parse_float=Decimal)
    except ValueError:
        body = None
    return resp.status_code, body, remaining


def _parse_time(value):
    """ISO 8601 to an aware datetime, or None when absent or unparseable. A missing
    quote time means the row is skipped, never stamped with a guessed time."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def quote_row(symbol, d):
    """Build the live_quotes tuple from a Sahmk quote dict, or None when there is no
    usable price or time. A non-positive price (a halted or not-yet-traded symbol the
    source reports as 0) is treated as no quote, never stored as a real price."""
    price = d.get("price")
    qtime = _parse_time(d.get("updated_at"))
    if price is None or price <= 0 or qtime is None:
        return None
    return (
        symbol, price, d.get("change"), d.get("change_percent"),
        d.get("previous_close"), qtime, bool(d.get("is_delayed", True)),
        "sahmk", SOURCE_URL,
    )


def tasi_row(d):
    """Build the TASI live_quotes tuple from the market-summary dict, or None. The index
    has no previous_close field, so it is derived as value minus change (Decimal minus an
    int or Decimal is exact)."""
    value = d.get("index_value")
    qtime = _parse_time(d.get("timestamp"))
    if value is None or value <= 0 or qtime is None:
        return None
    change = d.get("index_change")
    prev = value - change if change is not None else None
    return (
        TASI, value, change, d.get("index_change_percent"), prev, qtime,
        bool(d.get("is_delayed", True)), "sahmk", SOURCE_URL,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="fetch and print, do not write")
    parser.add_argument("--delay", type=float, default=6.5, help="seconds between calls (<10/min)")
    parser.add_argument("--limit", type=int, default=0, help="only the first N symbols (smoke test)")
    parser.add_argument("--symbols", default="", help="comma-separated symbols to fetch (else all), for re-running failures")
    parser.add_argument("--no-index", action="store_true", help="skip the TASI index call")
    args = parser.parse_args()

    key = api_key()
    conn = db.connect()
    db.assert_schema(conn)
    run_id = db.new_run_id()
    syms = db.active_symbols(conn)
    if args.symbols:
        want = {s.strip() for s in args.symbols.split(",") if s.strip()}
        syms = [s for s in syms if s in want]
    if args.limit:
        syms = syms[: args.limit]
    print(f"Live sweep {run_id}: {len(syms)} companies, delay={args.delay}s, dry_run={args.dry_run}")

    rows = []
    ok = empty = failed = 0
    stopped = None
    for i, sym in enumerate(syms):
        if i:
            time.sleep(args.delay)
        try:
            status, body, remaining = get_json(f"/quote/{sym}/", key)
        except Exception as exc:
            failed += 1
            print(f"  {sym}: request error {exc}", file=sys.stderr)
            if not args.dry_run:
                db.log_ingest(conn, run_id, sym, SOURCE, "error", str(exc), 0)
            continue

        if status == 429:
            stopped = "rate limited (429)"
            break
        if status != 200 or not isinstance(body, dict):
            empty += 1
            msg = f"http {status}"
            print(f"  {sym}: {msg}")
            if not args.dry_run:
                db.log_ingest(conn, run_id, sym, SOURCE, "empty", msg, 0)
            continue

        row = quote_row(sym, body)
        if row is None:
            empty += 1
            print(f"  {sym}: no price/time in response")
            if not args.dry_run:
                db.log_ingest(conn, run_id, sym, SOURCE, "empty", "no price or quote time", 0)
            continue

        rows.append(row)
        ok += 1
        print(f"  {sym}: {row[1]} at {row[5].isoformat()} (delayed={row[6]}) [remaining={remaining}]")
        if remaining is not None and remaining <= MIN_REMAINING:
            stopped = f"daily budget nearly spent (remaining={remaining})"
            break

    # TASI index, unless skipped or we already stopped on the budget.
    if not args.no_index and stopped is None:
        if syms:
            time.sleep(args.delay)
        try:
            status, body, remaining = get_json(f"/market/summary/?index={TASI}", key)
            if status != 200 or not isinstance(body, dict):
                print(f"  {TASI}: http {status}")
                if not args.dry_run:
                    db.log_ingest(conn, run_id, TASI, SOURCE, "empty", f"http {status}", 0)
            else:
                trow = tasi_row(body)
                if trow is not None:
                    rows.append(trow)
                    print(f"  {TASI}: {trow[1]} at {trow[5].isoformat()} [remaining={remaining}]")
                else:
                    print(f"  {TASI}: no index value in response")
                    if not args.dry_run:
                        db.log_ingest(conn, run_id, TASI, SOURCE, "empty", "no index value", 0)
        except Exception as exc:
            print(traceback.format_exc(), file=sys.stderr)
            if not args.dry_run:
                db.log_ingest(conn, run_id, TASI, SOURCE, "error", str(exc), 0)

    if args.dry_run:
        print(f"Dry run: would write {len(rows)} rows ({ok} quotes ok, {empty} empty, {failed} failed)")
        conn.close()
        return

    written = db.upsert_live_quotes(conn, rows)
    conn.commit()
    summary = f"sweep done: {written} written, {ok} ok, {empty} empty, {failed} failed"
    if stopped:
        summary += f", stopped: {stopped}"
    db.log_ingest(conn, run_id, None, SOURCE, "success" if not stopped else "partial", summary, written)
    conn.close()
    print(summary)


if __name__ == "__main__":
    main()
