"""Integration tests for db.py against a live Postgres.

These skip automatically when no database is reachable (for example in CI without a
local Postgres). They use the throwaway test symbol 0000 and clean up after.
"""

import pytest

import db


@pytest.fixture()
def conn():
    try:
        c = db.connect()
    except Exception:
        pytest.skip("local database not reachable")
    try:
        yield c
    finally:
        c.close()


def test_assert_schema_passes(conn):
    # Should not raise against the migrated schema.
    db.assert_schema(conn)


def test_log_ingest_roundtrip(conn):
    run_id = db.new_run_id()
    db.log_ingest(conn, run_id, "0000", "system", "success", "test row", 3)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT source, status, rows_written FROM ingest_log WHERE run_id = %s",
            (run_id,),
        )
        row = cur.fetchone()
        cur.execute("DELETE FROM ingest_log WHERE run_id = %s", (run_id,))
    conn.commit()
    assert row == ("system", "success", 3)


def test_upsert_prices_idempotent(conn):
    sym = "0000"
    try:
        db.upsert_company(conn, sym, "Test Co", None, "Test", sym + ".SR")
        rows = [(sym, "2020-01-05", "10", "11", "9", "10.5", "10.5", 1000)]
        n1 = db.upsert_prices(conn, rows)
        n2 = db.upsert_prices(conn, rows)  # same (symbol, date) updates, no duplicate
        conn.commit()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM prices_daily WHERE symbol = %s AND date = %s",
                (sym, "2020-01-05"),
            )
            count = cur.fetchone()[0]
        assert count == 1
        assert n1 == 1 and n2 == 1
    finally:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM prices_daily WHERE symbol = %s", (sym,))
            cur.execute("DELETE FROM companies WHERE symbol = %s", (sym,))
        conn.commit()
