# IPO dataset verification

This file lists every row in `data/ipos.csv` with its source link and any fields
that are less certain, so a human can verify by hand. No row is presented as
confirmed until a person checks it and flips `verified` to true in the CSV.

## Data honesty

- Every row is created with `verified=false`. The site shows an unverified badge on
  these rows until a human verifies them.
- Fields that could not be confirmed from a fetched source page are left empty, not
  guessed. A missing value stays empty.
- Every row has a `source_url` that points at the page the data was read from.

## Inclusion rules

Rows in scope:

- Saudi Main Market (TASI) only. Exclude Nomu, the parallel market.
- IPO date from 2019-12-01 to today.
- New listings only. Exclude direct listings of companies that were already public,
  and exclude transfers from Nomu to the Main Market (those are not IPOs).
- 4-digit numeric symbol. Yahoo ticker is `{symbol}.SR`.

Edge cases for human sign-off (NEEDS HUMAN):

- Companies that moved from Nomu to the Main Market: excluded as not new IPOs.
  Confirm none slipped in.
- Direct listings (no capital raise): excluded. Confirm.
- REITs and funds listed on the Main Market: included only if they were an IPO with
  an offer price in scope. Flag any that are ambiguous.

## CSV columns

`symbol,name_en,name_ar,sector,ipo_date,offer_price,shares_offered,proceeds_sar,oversubscription,source_url,verified`

- symbol: 4 digits
- name_en, name_ar: company name (Arabic may be empty if not confirmed)
- sector: TASI sector
- ipo_date: first trading date, YYYY-MM-DD
- offer_price: SAR per share at IPO (empty if not confirmed)
- shares_offered: number of shares offered (empty if not confirmed)
- proceeds_sar: total raised in SAR (empty if not confirmed)
- oversubscription: subscription coverage ratio (empty if not confirmed)
- source_url: the page the row was read from
- verified: false until a human checks it

## Sources

Confirmed fetchable (public) during source probing:

- Argaam per-IPO news articles, for example
  https://www.argaam.com/en/article/articledetail/id/1453871 (Theeb debut). These
  carry offer price, listing date, shares offered, proceeds, and oversubscription in
  the body text.
- Argaam company profile pages, for example
  https://www.argaam.com/en/tadawul/tasi/theeb. These carry the 4-digit symbol and
  sector reliably, but usually not the IPO price or date.
- Argaam public IPO monitor, https://www.argaam.com/en/disclosures/ipo/3. Public
  table with symbol, listing date, offer price, and a Type column (IPO vs Private
  Offering vs Right Issue) that helps exclude non-IPOs. Most recent years only on
  the first pages; older pages load by script.
- Saudipedia and reputable financial news (Zawya, Reuters, Arabian Business) as
  cross-checks.

Not usable as a data source:

- Argaam annual IPO recap articles (for example id/1780417) put the full table
  behind a login, so the tables are not fetchable. The article search snippet
  sometimes lists names and dates, which can seed the per-year list.
- saudiexchange.sa company pages are script-rendered, so a plain fetch does not
  return the data. They are reachable with a real browser if needed.

Each row records the specific page used in `source_url`.

## Methodology

Rows are collected by fetching the public source pages above and recording only
values that appear on a fetched page, with the exact page used as `source_url`.
Symbol, name, listing date, offer price, and sector are usually available. Shares
offered, total proceeds, and oversubscription are sometimes available in the per-IPO
article and otherwise left empty. The Type column on the Argaam monitor and the
per-article text are used to exclude private offerings, right issues, direct
listings, and Nomu transfers. Nothing is filled from memory; an unconfirmed field
stays empty and is flagged below for human verification.

## Row checklist

To be filled in during Phase 2 collection. One line per CSV row with its source and
any low-confidence fields. A human checks each, then flips `verified` to true in the
CSV and notes initials and date here.

| symbol | name_en | ipo_date | source_url | low-confidence fields | checked (initials/date) |
| --- | --- | --- | --- | --- | --- |

## Human sign-off

- [ ] Inclusion rules reviewed and accepted.
- [ ] Each row checked against its source.
- [ ] Ambiguous corporate actions confirmed.
