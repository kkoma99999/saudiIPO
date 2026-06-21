"""Incremental daily ingest. Run by the GitHub Actions cron Sunday to Thursday.

For each company already in the database, pull a small recent window (from a few
days before the last stored price, so late corrections and just-occurred splits are
captured) and upsert. Idempotent on (symbol, date), so a re-run or a delayed run
never double-writes. Every symbol outcome is logged to ingest_log.
"""

import argparse
import sys
import traceback
from datetime import date, timedelta

import yfinance as yf

import db
from backfill import DEFAULT_START, TASI, _num, parse_history

OVERLAP_DAYS = 5


def last_price_date(conn, symbol):
    with conn.cursor() as cur:
        cur.execute("SELECT max(date) FROM prices_daily WHERE symbol = %s", (symbol,))
        return cur.fetchone()[0]


def ipo_date(conn, symbol):
    with conn.cursor() as cur:
        cur.execute("SELECT ipo_date FROM ipos WHERE symbol = %s", (symbol,))
        row = cur.fetchone()
        return row[0] if row else None


def start_for(conn, symbol):
    last = last_price_date(conn, symbol)
    if last is not None:
        return (last - timedelta(days=OVERLAP_DAYS)).isoformat()
    ipo = ipo_date(conn, symbol)
    return ipo.isoformat() if ipo else DEFAULT_START


def update_symbol(conn, symbol, run_id, dry_run):
    start = start_for(conn, symbol)
    df = yf.Ticker(symbol + ".SR").history(start=start, auto_adjust=False, actions=True)
    if df is None or len(df) == 0:
        print(f"  {symbol}: no data from {start}")
        if not dry_run:
            db.log_ingest(conn, run_id, symbol, "yahoo_prices", "empty", f"no rows from {start}", 0)
        return
    prices, dividends, yf_splits = parse_history(symbol, df)
    print(f"  {symbol}: {len(prices)} prices, {len(dividends)} dividends, {len(yf_splits)} yahoo split events from {start}")
    if dry_run:
        return
    np = db.upsert_prices(conn, prices)
    nd = db.upsert_dividends(conn, dividends)
    conn.commit()
    db.log_ingest(conn, run_id, symbol, "yahoo_prices", "success", None, np)
    if nd:
        db.log_ingest(conn, run_id, symbol, "yahoo_dividends", "success", None, nd)
    # Corporate actions come from the verified data/corporate_actions.csv, applied by
    # backfill.py. A new split here just flags that the verified file may need an
    # update; we never auto-store yfinance splits.
    if yf_splits:
        db.log_ingest(conn, run_id, symbol, "yahoo_splits", "skipped",
                      f"yahoo reports a split in this window; confirm and update "
                      f"data/corporate_actions.csv if real", 0)


def update_tasi(conn, run_id, dry_run):
    with conn.cursor() as cur:
        cur.execute("SELECT max(date) FROM index_prices WHERE index_symbol = %s", (TASI,))
        last = cur.fetchone()[0]
    start = (last - timedelta(days=OVERLAP_DAYS)).isoformat() if last else DEFAULT_START
    df = yf.Ticker(TASI).history(start=start, auto_adjust=False, actions=False)
    if df is None or len(df) == 0:
        print(f"  {TASI}: no data from {start}")
        return
    rows = [(idx.date().isoformat(), _num(r.get("Close"))) for idx, r in df.iterrows()]
    rows = [(d, c) for (d, c) in rows if c is not None]
    print(f"  {TASI}: {len(rows)} index closes from {start}")
    if dry_run:
        return
    n = db.upsert_index_prices(conn, rows)
    conn.commit()
    db.log_ingest(conn, run_id, None, "yahoo_index", "success", None, n)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-index", action="store_true")
    args = parser.parse_args()

    conn = db.connect()
    db.assert_schema(conn)
    run_id = db.new_run_id()
    syms = db.active_symbols(conn)
    print(f"Daily run {run_id}: {len(syms)} companies, dry_run={args.dry_run}")

    ok, failed = 0, 0
    for symbol in syms:
        try:
            update_symbol(conn, symbol, run_id, args.dry_run)
            ok += 1
        except Exception:
            failed += 1
            conn.rollback()
            tb = traceback.format_exc()
            print(f"  {symbol}: ERROR\n{tb}", file=sys.stderr)
            if not args.dry_run:
                db.log_ingest(conn, run_id, symbol, "yahoo_prices", "error", tb, 0)

    if not args.no_index:
        try:
            update_tasi(conn, run_id, args.dry_run)
        except Exception:
            conn.rollback()
            print(traceback.format_exc(), file=sys.stderr)

    if not args.dry_run:
        db.log_ingest(conn, run_id, None, "system", "success", f"daily done: {ok} ok, {failed} failed", ok)
    conn.close()
    print(f"Done: {ok} ok, {failed} failed")


if __name__ == "__main__":
    main()
