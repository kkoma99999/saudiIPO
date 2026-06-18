"""Turn the valuation-extraction workflow output into data/ipo_valuation.csv and print
a review report. Stores only the sourced per-share inputs (recurring EPS TTM, book
value per share); the app computes P/E and P/B. Companies the workflow did not cover
keep an empty row. Nothing is invented.

Usage:  python process_extraction.py <workflow_output_json_path>
"""

import csv
import json
import os
import sys

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(_REPO, "data", "prospectuses")


def num(x, n=4):
    return "" if x is None else round(float(x), n)


def main():
    raw = json.load(open(sys.argv[1], encoding="utf-8"))
    rows = raw["result"] if isinstance(raw, dict) and "result" in raw else raw
    bySym = {}
    for r in rows:
        if isinstance(r, dict) and r.get("symbol"):
            bySym[str(r["symbol"]).strip()] = r

    manifest = []
    urls = {}
    with open(os.path.join(PDIR, "sources.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            s = r["symbol"].strip()
            manifest.append(s)
            urls[s] = r["url"]

    # write ipo_valuation.csv for all 73 (empty where not extracted)
    out_path = os.path.join(_REPO, "data", "ipo_valuation.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["symbol", "recurring_eps_ttm", "book_value_per_share", "source_url"])
        for s in manifest:
            r = bySym.get(s)
            if r and not r.get("failed"):
                w.writerow([s, num(r.get("recurringEpsTtm")), num(r.get("bookValuePerShare")), urls.get(s, "")])
            else:
                w.writerow([s, "", "", urls.get(s, "")])

    # report
    print(f"{'sym':<5} {'conf':<6} {'eps':>10} {'bvps':>10} {'pe':>7} {'pb':>6}  flags")
    counts = {"high": 0, "medium": 0, "low": 0}
    flagged = []
    for s in manifest:
        r = bySym.get(s)
        if not r or r.get("failed"):
            print(f"{s:<5} {'MISSING':<6}")
            continue
        conf = r.get("confidence", "?")
        counts[conf] = counts.get(conf, 0) + 1
        eps = r.get("recurringEpsTtm")
        bvps = r.get("bookValuePerShare")
        pe = r.get("peRecurringTtm")
        pb = r.get("priceToBook")
        flags = []
        if conf == "low":
            flags.append("LOW")
        if conf == "medium":
            flags.append("med")
        if eps is not None and eps <= 0:
            flags.append("LOSS")
        if pe is not None and (pe > 80 or pe < 3):
            flags.append("pe?")
        if pb is not None and (pb > 25 or pb <= 0):
            flags.append("pb?")
        if eps is None or bvps is None:
            flags.append("nodata")
        fl = ",".join(flags)
        if fl:
            flagged.append(s)
        print(f"{s:<5} {conf:<6} {num(eps):>10} {num(bvps):>10} "
              f"{('' if pe is None else round(pe,2)):>7} {('' if pb is None else round(pb,2)):>6}  {fl}")

    filled = sum(1 for s in manifest if bySym.get(s) and not bySym[s].get("failed")
                 and bySym[s].get("recurringEpsTtm") is not None)
    print(f"\nfilled {filled}/{len(manifest)}  | high {counts.get('high',0)} "
          f"medium {counts.get('medium',0)} low {counts.get('low',0)}")
    print(f"flagged for review: {', '.join(flagged)}")
    n = bySym.get("4164")
    if n:
        print(f"NAHDI check (expect ~6.53 / ~15.99): eps={num(n.get('recurringEpsTtm'))} bvps={num(n.get('bookValuePerShare'))}")


if __name__ == "__main__":
    main()
