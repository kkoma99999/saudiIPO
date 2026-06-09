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
multiplier; a 1-for-5 bonus is factor 1.20, a par change from 10 SAR to 1 SAR is
factor 10). F comes from the verified data/corporate_actions.csv, never from raw
yfinance splits (those are unreliable on .SR, see below).

- split_adjusted_offer_price = raw_offer_price / F(after ipo_date)
- For a dividend with ex-date e and raw amount A:
  adjusted_dividend_per_current_share = A / F(after e)
- price_return = split_adjusted_close / split_adjusted_offer_price - 1
- total_return = price_return + sum(adjusted_dividends) / split_adjusted_offer_price
- yield_on_offer = cumulative_adjusted_dividends / split_adjusted_offer_price
- cagr = (1 + total_return) ^ (1 / years) - 1, years measured ACT/365.25
- tasi_return = tasi_close(end) / tasi_close(start) - 1 over the same window
- alpha = total_return - tasi_return
- first_days_return = close_on_5th_session / split_adjusted_offer_price - 1. The
  early "listing" return from the offer to the close after five trading sessions. It
  is the same math as price_return on an early close: no corporate action lands inside
  an IPO's first week, so F is the same and only the offer is divided by F. It is shown
  only when the early window is clean: the price history must start within 5 days of
  the IPO and the five sessions must span at most 14 days. Many .SR tickers have gapped
  early history (4161 BinDawood's data begins about six months after its IPO), so a
  gapped or under-five-session series has no first_days_return. It stays empty, never
  guessed from a partial or much-later window.

The stored close is already split adjusted by yfinance (see below), so it is used as
is. Never multiply a stored close by F; that would double count. We only divide the
offer and each dividend by F. Dividends are never baked into price; they are always a
separate, visible term.

## Nominal value and percentage dividends

- nominal_value (القيمة الاسمية) is the par value per share. Standard TASI par is 10
  SAR but it is verified per company and left empty when unconfirmed. A par change
  (for example 10 SAR to 1 SAR) is a split with factor old_par / new_par.
- The dividends table stores SAR per share as actually paid, never a percentage. If a
  source quotes a dividend as a percentage, it is a percentage of nominal value at
  that date: dps = pct / 100 * nominal_value. Use pct_to_dps and never compute a
  yield against nominal value unless the label says exactly that.

## Dividends and the Yahoo gap

- yfinance dividends on `.SR` tickers have gaps and are reported RAW, meaning per
  the share count on the ex-date, not split-adjusted. The math above divides each
  raw dividend by F after its ex-date to put it in current-share terms.
- Cross-check dividends against saudiexchange.sa. When sources disagree, prefer
  saudiexchange.sa and record the source field. Missing dividend data stays empty
  plus an ingest_log row, never invented.

## Bonus issues and splits (and why yfinance is not trusted for them)

- yfinance .SR split data is unreliable. It duplicates one event across adjacent days
  (a real 10:1 par change shows as two factor-10 events, cumulative 100), reports
  spurious events the price was never adjusted for (Naqi 2282 had a 100x event for a
  par split the assembly rejected), and misses real bonuses. So we do NOT store
  yfinance splits as corporate actions.
- corporate_actions come from data/corporate_actions.csv: verified bonus issues,
  splits, and par changes, each with kind, factor (share multiplier), and a
  source_url, confirmed against Argaam, CMA disclosures, and saudiexchange. The math
  treats bonus, split, and par change identically; only the factor matters.
- backfill.py still reads yfinance splits, but only to log a cross-check discrepancy
  in ingest_log. A new yfinance split is a prompt to confirm and update the CSV, not
  a fact to store. See docs/FINANCE_AUDIT.md.

## yfinance price basis (important, do not get this wrong)

Pull history with auto_adjust=False. Then:

- Close is already split and bonus adjusted by yfinance into CURRENT-share basis. It
  is not the true raw price. The most recent Close is the actual current price
  (there are no later actions to adjust it).
- Adj Close is split and dividend adjusted. We keep it only as a cross-check and do
  not use it in return math (it folds dividends into price, which would double-count
  against total_return).
- Dividends are raw, meaning per the share count on the ex-date, not split adjusted.

Because Close is in current-share basis and the latest Close needs no adjustment,
the iron-rule formulas are correct for a return measured to today when you:

- use the latest Close as adjusted_close,
- use adjusted_offer_price = offer_price / F, where F is the cumulative factor of
  all post-IPO actions,
- divide each raw dividend by the factor of actions after its ex-date.

Do not pass a historical yfinance Close through an extra split adjustment; it is
already adjusted, so that would double count. For the price-vs-TASI chart, use the
Close series as is (it is self-consistent in current-share basis) and index both the
stock and the index to 100 at the IPO date.

## Data quality on .SR

Some .SR series carry Yahoo scaling or gap issues. For example Aramco (2222.SR) shows
a whole-series scale that sits below the real historical prices. We do not correct
source data by hand. Such rows stay verified=false and are flagged for a human in
docs/VERIFICATION.md.

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
