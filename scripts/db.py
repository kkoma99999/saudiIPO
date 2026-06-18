"""Database access for ingestion.

Drizzle owns the schema. This module never creates or alters tables. It connects by
DATABASE_URL, verifies the schema matches what the ingester expects, writes to
ingest_log, and provides idempotent upserts. Money flows as decimal.Decimal so it
lands in numeric columns without float contamination.
"""

import os
import uuid
from decimal import Decimal

import psycopg
from dotenv import load_dotenv

# Load the repo-root .env so DATABASE_URL is available when running from scripts/.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_REPO_ROOT, ".env"))

# Expected columns per table. Kept in sync with src/db/schema.ts by hand. The schema
# assertion below fails loudly if the database drifts from this contract.
EXPECTED = {
    "companies": {
        "symbol", "name_en", "name_ar", "sector", "data_caveat", "listing_date",
        "yahoo_ticker", "is_active", "created_at", "updated_at",
    },
    "ipos": {
        "id", "symbol", "offer_price", "nominal_value", "shares_offered",
        "proceeds_sar", "oversubscription", "recurring_eps_ttm", "book_value_per_share",
        "valuation_source_url", "ipo_date", "source_url", "verified",
        "created_at", "updated_at",
    },
    "prices_daily": {
        "id", "symbol", "date", "open", "high", "low", "close",
        "adj_close", "volume", "ingested_at",
    },
    "dividends": {
        "id", "symbol", "ex_date", "amount", "source", "verified", "ingested_at",
    },
    "corporate_actions": {
        "id", "symbol", "action_date", "type", "kind", "factor", "ratio_text",
        "source", "source_url", "verified", "ingested_at",
    },
    "index_prices": {
        "id", "index_symbol", "date", "close", "ingested_at",
    },
    "ingest_log": {
        "id", "run_at", "run_id", "symbol", "source", "status",
        "message", "rows_written",
    },
}


class SchemaDriftError(RuntimeError):
    """Raised when the live database does not match the expected schema."""


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Copy .env.example to .env.")
    return url


def connect() -> psycopg.Connection:
    """Open a connection. The caller manages the transaction lifecycle."""
    return psycopg.connect(database_url())


def new_run_id() -> str:
    return str(uuid.uuid4())


def log_ingest(conn, run_id, symbol, source, status, message=None, rows_written=0):
    """Write one ingest_log row. Truncates very long messages."""
    if message is not None and len(message) > 4000:
        message = message[:4000]
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ingest_log (run_id, symbol, source, status, message, rows_written)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (run_id, symbol, source, status, message, rows_written),
        )
    conn.commit()


def assert_schema(conn) -> None:
    """Verify every expected table and column exists. Raise on drift.

    On drift, try to log a system error row, then raise SchemaDriftError.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ANY(%s)
            """,
            (list(EXPECTED.keys()),),
        )
        actual: dict[str, set] = {}
        for table_name, column_name in cur.fetchall():
            actual.setdefault(table_name, set()).add(column_name)

    problems = []
    for table, expected_cols in EXPECTED.items():
        found = actual.get(table)
        if found is None:
            problems.append(f"missing table {table}")
            continue
        missing = expected_cols - found
        if missing:
            problems.append(f"{table} missing columns {sorted(missing)}")

    if problems:
        message = "Schema drift: " + "; ".join(problems)
        try:
            log_ingest(conn, new_run_id(), None, "system", "error", message)
        except Exception:
            pass
        raise SchemaDriftError(message)


def _d(value):
    """Convert to Decimal via str, or None for empty values."""
    if value is None or value == "":
        return None
    return Decimal(str(value))


def upsert_company(conn, symbol, name_en, name_ar, sector, yahoo_ticker):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO companies (symbol, name_en, name_ar, sector, yahoo_ticker)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (symbol) DO UPDATE SET
              name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
              sector = EXCLUDED.sector, yahoo_ticker = EXCLUDED.yahoo_ticker,
              updated_at = now()
            """,
            (symbol, name_en, name_ar or None, sector or None, yahoo_ticker),
        )


def upsert_ipo(conn, symbol, offer_price, shares_offered, proceeds_sar,
               oversubscription, ipo_date, source_url, verified=False):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ipos (symbol, offer_price, shares_offered, proceeds_sar,
                              oversubscription, ipo_date, source_url, verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (symbol) DO UPDATE SET
              offer_price = EXCLUDED.offer_price,
              shares_offered = EXCLUDED.shares_offered,
              proceeds_sar = EXCLUDED.proceeds_sar,
              oversubscription = EXCLUDED.oversubscription,
              ipo_date = EXCLUDED.ipo_date, source_url = EXCLUDED.source_url,
              verified = EXCLUDED.verified, updated_at = now()
            """,
            (symbol, _d(offer_price), shares_offered or None, _d(proceeds_sar),
             _d(oversubscription), ipo_date, source_url, verified),
        )


def upsert_prices(conn, rows) -> int:
    """rows: iterable of (symbol, date, open, high, low, close, adj_close, volume)."""
    data = [
        (s, d, _d(o), _d(h), _d(low), _d(c), _d(ac), v)
        for (s, d, o, h, low, c, ac, v) in rows
    ]
    if not data:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO prices_daily (symbol, date, open, high, low, close, adj_close, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (symbol, date) DO UPDATE SET
              open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
              close = EXCLUDED.close, adj_close = EXCLUDED.adj_close,
              volume = EXCLUDED.volume, ingested_at = now()
            """,
            data,
        )
    return len(data)


def upsert_dividends(conn, rows, source="yahoo") -> int:
    """rows: iterable of (symbol, ex_date, amount)."""
    data = [(s, ed, _d(a), source) for (s, ed, a) in rows]
    if not data:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO dividends (symbol, ex_date, amount, source, verified)
            VALUES (%s, %s, %s, %s, false)
            ON CONFLICT (symbol, ex_date, source) DO UPDATE SET
              amount = EXCLUDED.amount, ingested_at = now()
            """,
            data,
        )
    return len(data)


def _source_label(url):
    if not url:
        return "verified"
    for k in ("argaam", "zawya", "cma", "saudiexchange", "aleqt", "maaal", "smeh",
              "sahmcapital", "mubasher"):
        if k in url:
            return k
    return "web"


def upsert_actions(conn, rows) -> int:
    """Verified corporate actions from data/corporate_actions.csv.

    rows: iterable of (symbol, action_date, kind, factor, ratio_text, source_url,
    verified). The type enum carries only split/bonus, so kind holds the richer
    label (bonus, split, par_change, rights). The factor drives all return math.
    """
    data = []
    for (s, ad, kind, f, ratio, url, verified) in rows:
        typ = "bonus" if kind == "bonus" else "split"
        v = str(verified).strip().lower() in ("true", "1") if isinstance(verified, str) else bool(verified)
        data.append((s, ad, typ, kind, _d(f), ratio, _source_label(url), url or None, v))
    if not data:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO corporate_actions
              (symbol, action_date, type, kind, factor, ratio_text, source, source_url, verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (symbol, action_date) DO UPDATE SET
              type = EXCLUDED.type, kind = EXCLUDED.kind, factor = EXCLUDED.factor,
              ratio_text = EXCLUDED.ratio_text, source = EXCLUDED.source,
              source_url = EXCLUDED.source_url, verified = EXCLUDED.verified,
              ingested_at = now()
            """,
            data,
        )
    return len(data)


def set_nominal(conn, symbol, nominal_value) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE ipos SET nominal_value = %s, updated_at = now() WHERE symbol = %s",
            (_d(nominal_value), symbol),
        )


def set_data_caveat(conn, symbol, caveat) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE companies SET data_caveat = %s, updated_at = now() WHERE symbol = %s",
            (caveat or None, symbol),
        )


def set_valuation(conn, symbol, recurring_eps_ttm, book_value_per_share, source_url) -> None:
    """Per-share figures from the prospectus used to value the offer (recurring EPS
    TTM and book value per share, both SAR). The P/E and P/B are computed from these
    and the offer price in the app. Empty fields land as NULL; nothing is invented."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ipos SET recurring_eps_ttm = %s, book_value_per_share = %s,
              valuation_source_url = %s, updated_at = now()
            WHERE symbol = %s
            """,
            (_d(recurring_eps_ttm), _d(book_value_per_share), source_url or None, symbol),
        )


def upsert_index_prices(conn, rows, index_symbol="^TASI.SR") -> int:
    """rows: iterable of (date, close)."""
    data = [(index_symbol, d, _d(c)) for (d, c) in rows]
    if not data:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO index_prices (index_symbol, date, close)
            VALUES (%s, %s, %s)
            ON CONFLICT (index_symbol, date) DO UPDATE SET
              close = EXCLUDED.close, ingested_at = now()
            """,
            data,
        )
    return len(data)
