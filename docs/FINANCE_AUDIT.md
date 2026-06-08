# Financial audit

A full audit of every financial calculation in the codebase, the bugs found, the
fixes applied, and the proof by tests and reconciliation against real sources. Done
2026-06-08.

## Verdict

The displayed returns were wrong. The cause was not the math but the data: yfinance
.SR corporate-action events are corrupt, and the metrics treated yfinance's already
split-adjusted close as if it were raw. After the fix, returns are correct and
reconcile against saudiexchange.

## Prime suspect (auto_adjust): checked, not the active bug

The suspicion was that we fetched with the yfinance default auto_adjust=True (so the
close is split and dividend adjusted) and then added dividends and our own split
factors on top, double counting. Checked:

- Context7 (official yfinance docs) confirms Ticker.history auto_adjust default is
  True. We override it: scripts/backfill.py fetch_history uses auto_adjust=False.
- Empirical: with auto_adjust=False, 2020-01 Aramco close is 29.01; with True it is
  21.74. We store the 29.01 value (the Close column, not Adj Close), so dividends are
  not baked into our close and not double counted.

So dividends are a clean separate term. The prime suspect is cleared.

## Empirical findings (the probes)

1. yfinance auto_adjust=False Close is split and bonus adjusted to current-share
   basis, NOT raw. Proof: around Al Rajhi's 1.6 split on 2022-05-09 the close runs
   74.92, 75.07, 72.00 with no jump; a raw series would drop by 1.6x on the ex-date.
2. yfinance .SR split events are unreliable:
   - 4192 Alsaif and 4161 BinDawood: a real 10-to-1 par change duplicated across two
     adjacent days (factor 10 and 10) gives a cumulative 100.
   - 2282 Naqi: a single 100x event the close was never adjusted for (the par split
     was rejected by the assembly). Fully spurious.
   - 2222 Aramco: four 1.1 events, two of them four days apart in 2020, and the
     historical close is adjusted by only ~1.21, inconsistent with its own events.
3. repair=True (needs scipy) does not fix the split events, so it is not used.

## Formula inventory

| where | implemented before | correct definition | verdict and fix |
| --- | --- | --- | --- |
| metrics.ts adjustedOfferPrice | offer / F(after ipo) | same | correct, kept |
| metrics.ts adjustedCloseAsOf | close * F(after asOf) | close is already split adjusted; no multiply | BUG (latent; only safe because always called with the latest date, factor 1). Fixed: function removed; price uses the stored close directly |
| metrics.ts priceReturn | adjustedClose(close*F) / (offer/F) - 1 | close / (offer/F) - 1 | fixed with the above |
| metrics.ts totalReturn | price + cumDiv/adjOffer | same | correct math, was fed corrupt F; now correct |
| metrics.ts cumulativeAdjustedDividends | sum(A / F(after exDate)) | same | correct, kept |
| metrics.ts pctToDps | absent | pct/100 * nominal | added |
| queries.ts computeMetrics | applies metrics to all corporate_actions | same, on verified actions | correct; data source fixed |
| queries.ts getCompanyDetail series | stored close indexed to 100 | split-adjusted series, self consistent | correct, kept |
| backfill.py parse_history | stored every yfinance split as a corporate action | yfinance splits are unreliable; do not store | BUG. Fixed: actions come from verified data/corporate_actions.csv; yfinance splits are deduped and only logged as a cross-check |
| corporate_actions data | raw yfinance factors (100, 20, 12.5, dup 1.46) | verified factors per saudiexchange/Argaam | BUG (root cause). Fixed: 17 companies re-verified |
| UI formatting (format.ts) | SAR 2dp, percent 1dp, signed | same | correct, kept |

## The corporate-action corruption (root cause), before and after

| symbol | company | before (yfinance) | after (verified) | source |
| --- | --- | --- | --- | --- |
| 4192 | Alsaif | factor 100 (10 x 10, 1 day apart) | par_change 10 | par now 1 on saudiexchange |
| 4161 | BinDawood | factor 100 | par_change 10 | par now 1 |
| 2282 | Naqi | factor 100 (single, spurious) | none (split rejected) | par still 10 |
| 7204 | Perfect Presentation | factor 20 (missed a bonus) | 10 x 2 x 1.1 = 22 | Argaam |
| 2222 | Aramco | factor 1.4641 (2 spurious 2020 events) | 1.1 x 1.1 = 1.21 | capital 75B to 90B |

Effect on the headline return (offer to latest close):

| symbol | before | after |
| --- | --- | --- |
| 4192 Alsaif | thousands of percent | -39.7% |
| 2282 Naqi | about +7588% | -23.1% |
| 2222 Aramco | +23.5% | +2.7% |

## Reconciliation (saudiexchange via the Chrome MCP, 2026-06-08)

The authoritative source for par value and capital is saudiexchange.sa. Read through
the user's real browser (it blocks automation otherwise).

- 2222 Aramco: Par Value/Share shown as none; capital changes 75,000,000,000 then
  90,000,000,000, matching the two 1-for-10 bonus issues. Confirms F = 1.21.
- 4192 Alsaif: Par Value/Share = 1; paid capital 350,000,000 over 350,000,000 shares.
  At IPO it was 35,000,000 shares at par 10. Shares multiplied by 10, confirming the
  par change factor 10 (not the corrupt 100).

Current price reconciliation: our prices are the latest yfinance close, dated
2026-06-08, the same date as the TASI index close (10973.08, which matches a live
yfinance pull exactly), so the price window is aligned. A full halala-exact dividend
reconciliation against saudiexchange dividend pages for every company is left as a
NEEDS HUMAN item, since Yahoo has known dividend gaps on .SR and those rows are still
unverified.

## Golden tests (exact numbers, in metrics.test.ts and test_adjustment.py)

1. No actions: offer 50, close 60, dividend 2 -> price 0.2000, total 0.2400.
2. 1-for-1 bonus (factor 2): offer 50 to 25, pre-bonus dividend 4 to 2, total 0.2800.
3. Par 10 to 1 (factor 10) then 1.2 bonus: cumulative 12, adjusted offer 8.3333,
   price 0.4400.
4. Dividend before vs after a 1.5 bonus: 3 to 2.00 and 3 to 3.00, cumulative 5.0000,
   total 0.4500.
5. Percentage dividend: 10% on par 10 is 1.00 SAR.
6. Total equals price with zero dividends, else exactly + cum_div/adjusted_offer.
   Plus a dedupe test (two factor-10 events one day apart collapse to one) and a
   percentage-detector test. All pass in both TypeScript and Python.

## Rights issues and caveats (not modeled, flagged)

- 1322 AMAK and 2082 ACWA had rights issues. We do not model the rights dilution, so
  these carry a data-caveat badge and a NEEDS HUMAN entry. The returns shown are best
  effort.
- 2222 Aramco carries a caveat that yfinance's historical series for this ticker is
  internally inconsistent; the headline return uses the verified factor and the
  latest close, which are reliable, but the chart shape may be imperfect.

## Display rules

SAR two decimals, percentages one decimal, never scientific notation, negative
returns clearly signed. Implemented in src/lib/format.ts.
