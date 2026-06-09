"""Backfill daily prices, dividends, and splits per symbol from the IPO date.

Reads symbols from data/ipos.csv (or a --symbols override for testing), pulls full
history per symbol via yfinance with auto_adjust=False, and writes to Postgres
idempotently. Every symbol outcome is logged to ingest_log. A failure on one symbol
is logged and the loop continues.

See .claude/skills/tadawul-data/SKILL.md for the price basis: yfinance Close is in
current-share basis, Adj Close is a cross-check only, dividends are raw.

Usage:
  python backfill.py                      # all symbols from data/ipos.csv
  python backfill.py --symbols 1120,2380  # specific symbols (testing)
  python backfill.py --dry-run            # show the plan, write nothing
  python backfill.py --limit 5            # first 5 symbols only
"""

import argparse
import csv
import os
import sys
import traceback
from datetime import date

import pandas as pd
import yfinance as yf

import db

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IPOS_CSV = os.path.join(_REPO_ROOT, "data", "ipos.csv")
TASI = "^TASI.SR"
DEFAULT_START = "2018-01-01"


def _num(x):
    """Float or None for NaN, for numeric columns."""
    return None if x is None or pd.isna(x) else float(x)


def _vol(x):
    return None if x is None or pd.isna(x) else int(x)


def load_targets(args):
    if args.symbols:
        return [
            {"symbol": s.strip(), "ipo_date": args.start or DEFAULT_START, "from_csv": False}
            for s in args.symbols.split(",")
            if s.strip()
        ]
    targets = []
    with open(IPOS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            sym = (row.get("symbol") or "").strip()
            if not sym:
                continue
            row["from_csv"] = True
            targets.append(row)
    return targets


def seed_company(conn, t):
    symbol = t["symbol"]
    yahoo_ticker = symbol + ".SR"
    if t.get("from_csv"):
        db.upsert_company(conn, symbol, t.get("name_en") or symbol,
                          t.get("name_ar"), t.get("sector"), yahoo_ticker)
        if (t.get("offer_price") or "").strip() and (t.get("ipo_date") or "").strip():
            db.upsert_ipo(
                conn, symbol, t.get("offer_price"), t.get("shares_offered") or None,
                t.get("proceeds_sar"), t.get("oversubscription"), t.get("ipo_date"),
                t.get("source_url") or "", str(t.get("verified")).lower() == "true",
            )
    else:
        db.upsert_company(conn, symbol, symbol, None, None, yahoo_ticker)


def fetch_history(symbol, start):
    ticker = yf.Ticker(symbol + ".SR")
    return ticker.history(start=start, auto_adjust=False, actions=True)


def dedupe_splits(splits, window_days=7):
    """Collapse consecutive same-factor yfinance split events within window_days.

    yfinance .SR data often duplicates one corporate action across adjacent days.
    """
    out = []
    for d, f in sorted(splits):
        if out:
            prev_d, prev_f = out[-1]
            di = date.fromisoformat(d)
            dj = date.fromisoformat(prev_d)
            if abs((di - dj).days) <= window_days and abs(f - prev_f) < 1e-9:
                continue
        out.append((d, f))
    return out


def parse_history(symbol, df):
    """Return (prices, dividends, yf_splits).

    Close is yfinance's split and bonus adjusted close (current-share basis), stored
    as is. Adj Close is a cross-check. Dividends are raw. yf_splits are yfinance's
    split events, returned only for a cross-check against the verified
    corporate_actions; they are NOT stored, because yfinance .SR split data is
    unreliable (duplicates and spurious events). Corporate actions come from the
    verified data/corporate_actions.csv. Shared by backfill.py and daily.py.
    """
    prices, dividends, yf_splits = [], [], []
    for idx, r in df.iterrows():
        d = idx.date().isoformat()
        close = _num(r.get("Close"))
        # Close is required. Skip rows with no close (halts, bad source rows).
        if close is not None:
            prices.append((symbol, d, _num(r.get("Open")), _num(r.get("High")),
                           _num(r.get("Low")), close,
                           _num(r.get("Adj Close")), _vol(r.get("Volume"))))
        div = r.get("Dividends")
        if div is not None and not pd.isna(div) and float(div) != 0.0:
            dividends.append((symbol, d, float(div)))
        sp = r.get("Stock Splits")
        if sp is not None and not pd.isna(sp) and float(sp) != 0.0:
            yf_splits.append((d, float(sp)))
    return prices, dividends, yf_splits


def store_symbol(conn, t, run_id, dry_run):
    symbol = t["symbol"]
    start = (t.get("ipo_date") or DEFAULT_START).strip() or DEFAULT_START
    df = fetch_history(symbol, start)

    if df is None or len(df) == 0:
        print(f"  {symbol}: no data from {start}")
        if not dry_run:
            db.log_ingest(conn, run_id, symbol, "yahoo_prices", "empty",
                          f"no rows from {start}", 0)
        return

    prices, dividends, yf_splits = parse_history(symbol, df)

    print(f"  {symbol}: {len(prices)} prices, {len(dividends)} dividends, {len(yf_splits)} yahoo split events from {start}")
    if dry_run:
        return

    seed_company(conn, t)
    np = db.upsert_prices(conn, prices)
    nd = db.upsert_dividends(conn, dividends)
    conn.commit()
    db.log_ingest(conn, run_id, symbol, "yahoo_prices", "success", None, np)
    if nd:
        db.log_ingest(conn, run_id, symbol, "yahoo_dividends", "success", None, nd)
    # Cross-check only. yfinance splits are not stored as corporate actions.
    if yf_splits:
        ded = dedupe_splits(yf_splits)
        prod = 1.0
        for _, f in ded:
            prod *= f
        db.log_ingest(
            conn, run_id, symbol, "yahoo_splits", "skipped",
            f"yahoo reports {len(yf_splits)} split events (deduped {len(ded)}, "
            f"cumulative {round(prod, 4)}); not stored, corporate actions come from "
            f"data/corporate_actions.csv",
            0,
        )


def store_tasi(conn, run_id, start, dry_run):
    df = yf.Ticker(TASI).history(start=start, auto_adjust=False, actions=False)
    if df is None or len(df) == 0:
        print(f"  {TASI}: no data")
        if not dry_run:
            db.log_ingest(conn, run_id, None, "yahoo_index", "empty", f"no rows from {start}", 0)
        return
    rows = [(idx.date().isoformat(), _num(r.get("Close"))) for idx, r in df.iterrows()]
    rows = [(d, c) for (d, c) in rows if c is not None]
    print(f"  {TASI}: {len(rows)} index closes from {start}")
    if dry_run:
        return
    n = db.upsert_index_prices(conn, rows)
    conn.commit()
    db.log_ingest(conn, run_id, None, "yahoo_index", "success", None, n)


def _read_csv(name):
    path = os.path.join(_REPO_ROOT, "data", name)
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def existing_symbols(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT symbol FROM companies")
        return {r[0].strip() for r in cur.fetchall()}


def load_verified_corporate_data(conn, run_id, dry_run):
    """Load the verified corporate actions, nominal values, and caveats from data/.

    These are the authoritative, sourced facts (data/corporate_actions.csv etc.),
    not yfinance output. Applied only to companies already seeded, so FK holds.
    """
    have = existing_symbols(conn)
    actions = [
        (r["symbol"], r["action_date"], r["kind"], r["factor"],
         r.get("ratio_text"), r.get("source_url"), r.get("verified"))
        for r in _read_csv("corporate_actions.csv") if r["symbol"].strip() in have
    ]
    nominals = [
        (r["symbol"], r["nominal_value"])
        for r in _read_csv("nominal_values.csv") if r["symbol"].strip() in have
    ]
    caveats = [
        (r["symbol"], r["caveat"])
        for r in _read_csv("data_caveats.csv") if r["symbol"].strip() in have
    ]
    print(f"  verified data: {len(actions)} actions, {len(nominals)} nominals, {len(caveats)} caveats")
    if dry_run:
        return
    na = db.upsert_actions(conn, actions)
    for sym, nom in nominals:
        db.set_nominal(conn, sym, nom)
    for sym, cav in caveats:
        db.set_data_caveat(conn, sym, cav)
    conn.commit()
    db.log_ingest(conn, run_id, None, "verified_actions", "success",
                  f"loaded {na} corporate actions, {len(nominals)} nominal values, {len(caveats)} caveats", na)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", help="comma separated symbols, overrides the CSV")
    parser.add_argument("--start", help="override start date YYYY-MM-DD")
    parser.add_argument("--limit", type=int, help="process only the first N symbols")
    parser.add_argument("--dry-run", action="store_true", help="write nothing")
    parser.add_argument("--no-index", action="store_true", help="skip the TASI index")
    args = parser.parse_args()

    targets = load_targets(args)
    if args.limit:
        targets = targets[: args.limit]

    conn = db.connect()
    db.assert_schema(conn)
    run_id = db.new_run_id()
    print(f"Backfill run {run_id}: {len(targets)} symbols, dry_run={args.dry_run}")

    ok, failed = 0, 0
    for t in targets:
        symbol = t["symbol"]
        try:
            store_symbol(conn, t, run_id, args.dry_run)
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
            store_tasi(conn, run_id, DEFAULT_START, args.dry_run)
        except Exception:
            conn.rollback()
            tb = traceback.format_exc()
            print(f"  {TASI}: ERROR\n{tb}", file=sys.stderr)
            if not args.dry_run:
                db.log_ingest(conn, run_id, None, "yahoo_index", "error", tb, 0)

    try:
        load_verified_corporate_data(conn, run_id, args.dry_run)
    except Exception:
        conn.rollback()
        tb = traceback.format_exc()
        print(f"  verified data: ERROR\n{tb}", file=sys.stderr)
        if not args.dry_run:
            db.log_ingest(conn, run_id, None, "verified_actions", "error", tb, 0)

    if not args.dry_run:
        db.log_ingest(conn, run_id, None, "system", "success",
                      f"backfill done: {ok} ok, {failed} failed", ok)
    conn.close()
    print(f"Done: {ok} ok, {failed} failed")


if __name__ == "__main__":
    main()
