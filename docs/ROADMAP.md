# Saudi TASI IPO Tracker - Roadmap

Single source of truth for progress. Work top to bottom, resume from the first
unchecked task, check off one task at a time and commit per task.

## NEEDS HUMAN (skip and keep going; list open ones in every status report)

- [ ] Create a Neon Postgres project; put the connection string in Vercel env and
      the GitHub Actions secret DATABASE_URL.
      DONE WHEN: a real Neon string exists in both places.
- [ ] Create the GitHub repo and push (gh CLI is not installed on this machine).
      DONE WHEN: the repo exists on GitHub with this code pushed.
- [ ] Create a Vercel project linked to the repo and set DATABASE_URL.
      DONE WHEN: the repo deploys to a Vercel URL.
- [ ] Verify each IPO row in data/ipos.csv against its source_url and flip verified
      to true. Claude sets verified=false on all rows and lists them in
      docs/VERIFICATION.md.
      DONE WHEN: human-checked rows have verified=true with initials/date in docs/VERIFICATION.md.
- [ ] Sign off the Main Market inclusion rules (Nomu transfers, direct listings to
      exclude) in docs/VERIFICATION.md.
      DONE WHEN: the inclusion-rules section is signed off.
- [ ] Confirm ambiguous corporate actions (bonus or split) where the source is unclear.
      DONE WHEN: each ambiguous corporate_actions row is marked reviewed.
      KNOWN ISSUE: yfinance reports four 1.10 split events for Aramco (2222),
      including two only four days apart (2020-06-04 and 2020-06-08), which looks
      like a duplicate/artifact. The cumulative factor 1.1^4 = 1.464 inflates
      Aramco's adjusted return (shows +23.5% price return while the current price
      27 is below the 32 offer). Verify Aramco's real bonus history and correct or
      remove the bad corporate_actions rows. Other large names may have similar
      yfinance .SR artifacts.
- [ ] Spot-check .SR price fidelity. yfinance Close is split/bonus adjusted to
      current-share basis and some series carry Yahoo scaling issues (Aramco 2222.SR
      sits below real historical prices). Confirm the current price and headline
      return look right for a few large names before trusting the numbers.
      DONE WHEN: a human has sanity-checked a sample and noted any bad series.

## Phase 1 - Foundation

- [x] git init + .gitignore. ACCEPTANCE: repo initialized, node_modules and .env ignored.
- [x] CLAUDE.md with the 7 iron rules and the session protocol. ACCEPTANCE: file present, commit references it.
- [x] .claude/skills/tadawul-data/SKILL.md. ACCEPTANCE: valid frontmatter, all market-rule sections present.
- [x] .mcp.json with next-devtools and playwright. ACCEPTANCE: parses as JSON, both servers listed.
- [x] Initialize Next.js 16 + TS strict + Tailwind 4 + shadcn/ui (npm). ACCEPTANCE: npm run build and tsc --noEmit pass.
- [x] npm scripts: dev, build, start, test, typecheck, db:push, db:generate, db:migrate, validate:ipos. ACCEPTANCE: each runs.
- [x] Drizzle config + src/db/schema.ts companies table. ACCEPTANCE: compiles; symbol char(4) PK, name_en, name_ar, sector.
- [x] ipos table. ACCEPTANCE: symbol FK, ipo_date, offer_price numeric, shares_offered, proceeds_sar numeric, oversubscription, source_url, verified.
- [x] prices_daily with index on symbol and unique (symbol,date). ACCEPTANCE: migration creates both; close/adj_close numeric.
- [x] dividends table. ACCEPTANCE: symbol, ex_date, amount numeric, source, verified; unique (symbol,ex_date,source).
- [x] corporate_actions table. ACCEPTANCE: symbol, action_date, type enum, factor numeric, ratio_text, source; unique (symbol,action_date).
- [x] index_prices table. ACCEPTANCE: index_symbol, date, close numeric; unique (index_symbol,date).
- [x] ingest_log table. ACCEPTANCE: run_at, run_id, symbol, source, status, rows_written, message; index on symbol.
- [x] Generate first Drizzle migration. ACCEPTANCE: migration file under drizzle/ applies to a fresh DB.
- [x] docker-compose.yml postgres:16 with healthcheck. ACCEPTANCE: docker compose up -d serves 5432 with a named volume.
- [x] .env.example. ACCEPTANCE: DATABASE_URL (local + Neon comment), NEXT_PUBLIC_SITE_URL; no real secrets.
- [x] Apply migrations to local Docker DB. ACCEPTANCE: all 7 tables exist.
- [x] scripts/validate_ipos.ts. ACCEPTANCE: runs on a sample csv, per-row pass/fail, exits non-zero on bad data.
- [x] Phase 1 boundary: typecheck + tests, update ROADMAP, commit, 5-line status. ACCEPTANCE: tsc and tests pass.

## Phase 2 - IPO dataset

- [ ] Define data/ipos.csv header + inclusion rules in docs/VERIFICATION.md. ACCEPTANCE: header is symbol,name_en,name_ar,sector,ipo_date,offer_price,shares_offered,proceeds_sar,oversubscription,source_url,verified; Main Market only, exclude Nomu and direct listings.
- [x] Collect 2019 Main Market IPOs (Argaam recap + saudiexchange.sa). ACCEPTANCE: each row has a working source_url, verified=false. (Dec 2019: Aramco. Pre-Dec-2019 listings excluded as out of scope.)
- [x] Collect 2020. ACCEPTANCE: same.
- [x] Collect 2021. ACCEPTANCE: same.
- [x] Collect 2022. ACCEPTANCE: same.
- [x] Collect 2023. ACCEPTANCE: same.
- [x] Collect 2024. ACCEPTANCE: same.
- [x] Collect 2025. ACCEPTANCE: same.
- [x] Collect 2026 year-to-date. ACCEPTANCE: same. (Collected via an 8-year fan-out workflow: 67 in-scope sourced rows, all verified=false.)
- [x] Generate docs/VERIFICATION.md listing every row with its source for sign-off. ACCEPTANCE: every csv row appears once with source_url and a checkbox; low-confidence fields flagged. (67 rows with per-row confidence notes; 5 excluded candidates noted.)
- [x] Run scripts/validate_ipos.ts on data/ipos.csv. ACCEPTANCE: exits zero; all structural rules pass. (67 rows, 0 failures.)
- [x] Phase 2 boundary: validate, update ROADMAP, commit, status. ACCEPTANCE: validator green.

## Phase 3 - Ingestion

- [x] scripts/requirements.txt + venv. ACCEPTANCE: pip install works; import yfinance, psycopg succeed. (yfinance 1.4.1 + psycopg verified on local Python 3.14.)
- [x] scripts/db.py: connection, ingest_log writer, schema-contract assert, upsert SQL. ACCEPTANCE: writes an ingest_log row; aborts on schema drift. (3 live-DB integration tests pass; skip when no DB.)
- [x] scripts/market_calendar.py Sun-Thu helper + test_market_calendar.py (named market_calendar to avoid shadowing stdlib calendar). ACCEPTANCE: False for Fri/Sat, True Sun-Thu.
- [x] scripts/adjustment.py pure Decimal funcs + test_adjustment.py hand-built bonus case. ACCEPTANCE: golden 1-for-5 bonus asserts adjusted offer 8.3333, total return 35.20%; fails if adjustment skipped.
- [x] scripts/backfill.py: per symbol from ipo_date, auto_adjust=False, raw prices + dividends + splits, idempotent upserts. ACCEPTANCE: dry run prints symbols and date ranges; real run writes prices_daily and one ingest_log row per symbol. (Validated on 1120: 1865 prices, 12 dividends, 3 actions; idempotent on re-run. Full-dataset run happens once Phase 2 ipos.csv lands.)
- [x] Missing or empty Yahoo data stays empty + ingest_log row (status empty/partial/skipped). ACCEPTANCE: a no-data symbol writes zero price rows and one log row. (Validated with symbol 9999: empty log row, no orphan company.)
- [x] Backfill TASI index into index_prices. ACCEPTANCE: ^TASI.SR closes stored where available. (1602 index closes stored.)
- [x] scripts/daily.py incremental + idempotent. ACCEPTANCE: running twice for one day makes no duplicate (symbol,date) rows. (Overlap window validated; idempotent upserts.)
- [x] Phase 3 boundary: pytest + typecheck, update ROADMAP, commit, status. ACCEPTANCE: pytest green. (15 Python tests + TS typecheck pass. Full-dataset backfill pending Phase 2 data.)

## Phase 4 - Metrics

- [x] src/lib/metrics.ts pure module (no IO), decimal.js. ACCEPTANCE: no db/fetch imports.
- [x] priceReturn, totalReturn, yieldOnOffer, cagr, compareToIndex implemented. ACCEPTANCE: each exported, typed.
- [x] metrics.test.ts written, includes the bonus golden case matching Python. ACCEPTANCE: all tests pass, golden case agrees with Phase 3.
- [x] Phase 4 boundary: typecheck + tests, update ROADMAP, commit, status. ACCEPTANCE: green. (19 TS tests pass; golden case equals Python.)

## Phase 5 - UI

- [x] src/db/client.ts (server-only) + queries.ts + lib/format + lib/i18n. ACCEPTANCE: server components read the DB.
- [x] Invoke frontend-design; build layout, tokens, shared components (ReturnBadge, UnverifiedBadge). ACCEPTANCE: single reusable UnverifiedBadge used by all pages. (Editorial-finance theme: bone/ink/emerald/gold, Fraunces + Geist Mono.)
- [x] / cohort dashboard by IPO year. ACCEPTANCE: renders real data, unverified badge where verified=false.
- [x] Playwright MCP screenshot-and-fix loop on /. ACCEPTANCE: screenshot captured, issues fixed, no console errors. (claude-in-chrome was denied; used direct Playwright headless. Home screenshot reviewed, no console/page errors.)
- [x] /ipos sortable filterable table (server fetch + client IpoTable). ACCEPTANCE: filter by year/sector/return, sort by columns, badges present.
- [x] Playwright loop on /ipos. ACCEPTANCE: clean final screenshot. (Reviewed; clean.)
- [x] /company/[symbol]: details, price-vs-TASI chart (Recharts client), dividend history; not-found for unknown symbol. ACCEPTANCE: valid symbol renders chart + metrics; unknown shows not-found. (/company/9999 returns 404.)
- [x] Playwright loop on /company/[symbol]. ACCEPTANCE: clean final screenshot. (Reviewed; chart renders both lines indexed to 100. Surfaced the Aramco .SR split artifact, logged to NEEDS HUMAN.)
- [x] Phase 5 boundary: typecheck + tests + build, update ROADMAP, commit, status. ACCEPTANCE: build passes. (typecheck + 19 tests + production build green; data pages force-dynamic.)

## Phase 6 - Automation

- [x] .github/workflows/daily.yml cron 30 12 * * 0-4, python 3.12, runs daily.py with DATABASE_URL secret, workflow_dispatch enabled. ACCEPTANCE: yaml valid, cron correct. (Parsed and verified: cron 30 12 * * 0-4, python 3.12, runs scripts/daily.py.)
- [x] README Deploy section: Vercel + Neon steps, links the NEEDS HUMAN items. ACCEPTANCE: steps present.
- [x] Phase 6 boundary: yaml lint, update ROADMAP, commit, status. ACCEPTANCE: workflow parses.

## Phase 7 - Polish

- [x] Loading and empty states on all pages. ACCEPTANCE: each page has a skeleton and a clear empty state. (loading.tsx for /, /ipos, /company; EmptyState in pages; error.tsx boundary.)
- [x] SEO metadata per route + generateMetadata for company pages. ACCEPTANCE: specific titles per page. (root template title, per-route metadata, company generateMetadata.)
- [x] Open Graph tags + default OG image. ACCEPTANCE: og:title/description/image exposed. (root openGraph + opengraph-image.tsx generated.)
- [x] /data-sources disclaimer page (Argaam + saudiexchange.sa, badge meaning, not investment advice). ACCEPTANCE: page present, linked from footer.
- [x] Final pass: grep for em dashes/emojis/filler in src; typecheck + tests + build green. ACCEPTANCE: clean checkout passes all checks. (no em dashes/emojis/filler outside the rule definition; all checks pass.)
