---
name: tadawul-data
description: Saudi Tadawul (TASI) market rules for the IPO tracker. Use when ingesting prices or dividends, computing returns, handling bonus issues or splits, or anything touching .SR tickers, SAR money, or the Sunday to Thursday trading calendar.
---

# Tadawul (TASI) data rules

Rules for the Saudi Main Market. Read this before writing ingestion code, return
math, or anything that reads or writes market data.

## Symbols and tickers

- Saudi listings use a 4-digit numeric symbol, for example 2222 (Aramco), 1120
  (Al Rajhi Bank).
- The Yahoo Finance ticker is `{symbol}.SR`, for example `2222.SR`. Validate and
  pad to 4 digits before building a ticker.
- The TASI index ticker on Yahoo is `^TASI.SR`. yfinance index history can be
  sparse, so store what is available and tolerate gaps.
- Main Market only. Exclude Nomu (the parallel market) and direct listings of
  companies that were already public.

## Trading calendar

- The market trades Sunday through Thursday. Friday and Saturday are the weekend.
- A daily ingest that runs on a non-trading day writes no price rows and logs an
  ingest_log row. Use the shared Sun-Thu helper in both Python and TypeScript.

## Market hours

- Continuous trading closes at 15:00 AST (Arabia Standard Time, UTC+3). Daily close
  prices are end-of-session values.
- The GitHub cron runs at 12:30 UTC, which is 15:30 AST, so the session has settled.

## Currency and precision

- Prices and money are SAR. The minor unit is the halala (1 SAR = 100 halalas).
- Store and compute money as numeric or decimal, never float. Drizzle numeric maps
  to a JS string; parse with decimal.js. Python uses decimal.Decimal. Round to
  halala precision only at display time.

## Return formulas

Let F = the product of all corporate-action factors after a given date (the share
multiplier; a 1-for-5 bonus is factor 1.20, a 2-for-1 split is factor 2.00).

- adjusted_offer_price = raw_offer_price / F(after ipo_date)
- For a dividend with ex-date e and raw amount A:
  adjusted_dividend_per_current_share = A / F(after e)
- price_return = adjusted_close / adjusted_offer_price - 1
- total_return = price_return + sum(adjusted_dividends) / adjusted_offer_price
- yield_on_offer = annual_dividends_per_current_share / adjusted_offer_price
- cagr = (1 + total_return) ^ (1 / years) - 1, years measured ACT/365.25
- tasi_return = tasi_close(end) / tasi_close(start) - 1 over the same window
- alpha = total_return - tasi_return

The latest close needs no adjustment because it is already in current-share terms.
For an as-of date that predates some actions, multiply that historical close
forward by F(after that date).

## Dividends and the Yahoo gap

- yfinance dividends on `.SR` tickers have gaps and are reported RAW, meaning per
  the share count on the ex-date, not split-adjusted. The math above divides each
  raw dividend by F after its ex-date to put it in current-share terms.
- Cross-check dividends against saudiexchange.sa. When sources disagree, prefer
  saudiexchange.sa and record the source field. Missing dividend data stays empty
  plus an ingest_log row, never invented.

## Bonus issues and splits

- Yahoo reports bonus issues as splits. Record every split or bonus in
  corporate_actions with the share-multiplier factor and a source. The math treats
  split and bonus identically; the type field is informational.

## Worked golden example (the shared unit-test fixture)

Raw offer 10.00 SAR, one 1-for-5 bonus (factor 1.20) after IPO, one 2.00 dividend
paid before the bonus, latest close 9.60.

- adjusted_offer_price = 10.00 / 1.20 = 8.3333
- adjusted_dividend = 2.00 / 1.20 = 1.6667
- price_return = 9.60 / 8.3333 - 1 = +0.1520 (+15.20%)
- total_return = 0.1520 + 1.6667 / 8.3333 = +0.3520 (+35.20%)

The forbidden raw view (9.60 / 10.00 - 1 = -4%) would wrongly show a loss. This is
why raw price comparison is forbidden. This exact case is asserted in both
scripts/tests/test_adjustment.py and src/lib/metrics.test.ts.

## Do not fabricate

A missing price or dividend stays empty and produces an ingest_log row. Never
guess, interpolate, or fill from memory.
