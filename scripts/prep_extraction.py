"""Build data/prospectuses/extract_args.json for the valuation extraction workflow.

One entry per company that has a prospectus text dump on disk:
  { symbol, company, slug, offerPrice, ipoDate, txt, url }
Offer price and IPO date come from the ipos table; the rest from sources.csv.
Run pdftotext first (see the shell step), then run this with the venv python.
"""

import csv
import json
import os

import db

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(_REPO, "data", "prospectuses")


def main():
    conn = db.connect()
    with conn.cursor() as cur:
        cur.execute("SELECT symbol, offer_price::text, ipo_date::text FROM ipos")
        meta = {r[0].strip(): (r[1], r[2]) for r in cur.fetchall()}

    rows = []
    with open(os.path.join(PDIR, "sources.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            sym = r["symbol"].strip()
            slug = r["slug"].strip()
            txt = os.path.join(PDIR, f"{slug}_{sym}.txt")
            if not os.path.exists(txt):
                continue
            op, dt = meta.get(sym, (None, None))
            rows.append({
                "symbol": sym,
                "company": r["company"],
                "slug": slug,
                "offerPrice": op,
                "ipoDate": dt,
                "txt": txt.replace("\\", "/"),
                "url": r["url"],
            })

    out = os.path.join(PDIR, "extract_args.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    print(f"prepared {len(rows)} companies -> {out}")


if __name__ == "__main__":
    main()
