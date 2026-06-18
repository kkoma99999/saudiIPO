"""Merge the fix/verify workflow output into data/ipo_valuation.csv.

Applies corrected recurring EPS TTM and book value per share for re-verified rows.
Symbols in SKIP_EMPTY are forced empty (their source document was the wrong or an
incomplete file, so no honest figure exists). Prints a before/after report.

Usage:  python merge_fixes.py <fix_workflow_output_json_path>
"""

import csv
import json
import os
import sys

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(_REPO, "data", "ipo_valuation.csv")

# Wrong/incomplete source PDF -> cannot source honestly, keep empty.
SKIP_EMPTY = {"6015", "2082"}


def main():
    raw = json.load(open(sys.argv[1], encoding="utf-8"))
    fixes = raw["result"] if isinstance(raw, dict) and "result" in raw else raw
    fixmap = {str(r["symbol"]).strip(): r for r in fixes if isinstance(r, dict) and r.get("symbol")}

    rows = []
    with open(CSV, encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for r in reader:
            rows.append(r)  # [symbol, eps, bvps, url]

    print(f"{'sym':<5} {'old_eps':>9} {'old_bvps':>9}  ->  {'new_eps':>9} {'new_bvps':>9}  note")
    changed = 0
    for r in rows:
        sym = r[0].strip()
        fx = fixmap.get(sym)
        if not fx:
            continue
        if sym in SKIP_EMPTY:
            if r[1] or r[2]:
                print(f"{sym:<5} {r[1]:>9} {r[2]:>9}  ->  {'':>9} {'':>9}  EMPTIED (bad source doc)")
            r[1], r[2] = "", ""
            continue
        eps = fx.get("recurringEpsTtm")
        bvps = fx.get("bookValuePerShare")
        agrees = fx.get("agreesWithFirstPass")
        conf = fx.get("confidence")
        if isinstance(eps, (int, float)) and eps > 0 and isinstance(bvps, (int, float)) and bvps > 0:
            ne, nb = round(eps, 4), round(bvps, 4)
            if str(ne) != r[1] or str(nb) != r[2]:
                note = f"{'confirm' if agrees else 'CORRECTED'} ({conf})"
                print(f"{sym:<5} {r[1]:>9} {r[2]:>9}  ->  {ne:>9} {nb:>9}  {note}")
                changed += 1
            r[1], r[2] = ne, nb
        else:
            print(f"{sym:<5} {r[1]:>9} {r[2]:>9}  ->  (kept; re-extract invalid eps/bvps {eps}/{bvps})")

    with open(CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

    filled = sum(1 for r in rows if r[1])
    print(f"\napplied; rows changed {changed}; filled {filled}/{len(rows)}")
    empties = [r[0] for r in rows if not r[1]]
    print(f"still empty: {', '.join(empties)}")


if __name__ == "__main__":
    main()
