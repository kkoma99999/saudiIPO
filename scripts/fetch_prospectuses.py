"""Download IPO prospectuses (نشرة الإصدار) listed in data/prospectuses/sources.csv.

Saves each to data/prospectuses/{slug}_{symbol}.pdf. Skips rows with no url and
files already on disk. This only fetches the source documents; it parses nothing and
invents nothing. A row with no url stays undownloaded and its company keeps an empty
valuation until a real prospectus figure is sourced.

Run from scripts/ with the venv python:  python fetch_prospectuses.py
"""

import csv
import os
import urllib.parse
import urllib.request

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(_REPO_ROOT, "data", "prospectuses")


def encode_url(u):
    # CMA filenames contain spaces; quote the path so urllib accepts them.
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit(
        (p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, p.fragment)
    )


def main():
    with open(os.path.join(DIR, "sources.csv"), newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    got = skipped = missing = 0
    for r in rows:
        url = (r.get("url") or "").strip()
        slug = (r.get("slug") or "").strip()
        sym = (r.get("symbol") or "").strip()
        if not url:
            missing += 1
            continue
        out = os.path.join(DIR, f"{slug}_{sym}.pdf")
        if os.path.exists(out) and os.path.getsize(out) > 10000:
            skipped += 1
            continue
        try:
            req = urllib.request.Request(encode_url(url), headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
            if data[:4] != b"%PDF":
                print(f"  {sym} {slug}: not a PDF ({len(data)} bytes), skipped")
                continue
            with open(out, "wb") as fo:
                fo.write(data)
            print(f"  {sym} {slug}: {len(data) // 1024} KB")
            got += 1
        except Exception as e:  # noqa: BLE001 - report and continue
            print(f"  {sym} {slug}: ERROR {e}")

    print(f"downloaded {got}, already had {skipped}, no url for {missing}")


if __name__ == "__main__":
    main()
