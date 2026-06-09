@AGENTS.md

# Saudi TASI IPO Tracker

A website tracking every Saudi Main Market (TASI) IPO from January 2018 to today,
roughly 75 to 90 companies, no Nomu. Per company it shows offer price, current
price, return since IPO adjusted for bonus issues and splits, full dividend
history, dividend yield on offer price, and performance versus the TASI index.

Stack: Next.js 16 App Router, TypeScript strict, Tailwind 4, shadcn/ui, Recharts,
Drizzle ORM on Postgres (Neon in production, Docker Postgres locally). Ingestion is
Python 3.12 plus yfinance in scripts/. GitHub Actions runs the daily cron. Vercel
is the deploy target.

Commands: `npm run dev` | `npm test` | `npm run typecheck` | `npm run db:push` |
`npm run db:migrate` | `npm run validate:ipos`

## Iron rules

1. Never fabricate, estimate, or fill in market data. A missing value stays empty
   and gets a row in ingest_log explaining why. This applies to web fetches too: if
   a fetch fails, the field stays empty.
2. Every IPO record needs a source_url. No source, no row.
3. TASI symbols are 4 digits. The Yahoo Finance ticker is {symbol}.SR, for example
   2222.SR for Aramco.
4. Bonus share issues are frequent and Yahoo reports them as splits. Every split or
   bonus issue goes into corporate_actions and all return math uses the adjusted
   offer price. Raw price comparison is forbidden.
5. Return and adjustment math gets unit tests written before anything consumes it.
   price_return = adjusted_close / adjusted_offer_price - 1
   total_return = price_return + cumulative_dividends_per_adjusted_share / adjusted_offer_price
6. Write plain, direct, human copy in all generated content (code comments, README,
   commits, UI copy). Never use em dashes anywhere in any file. No emojis. No filler
   words like seamless, comprehensive, leverage, or robust.
7. Money columns are numeric/decimal, never float. Use decimal-safe math to halala
   precision. Drizzle numeric maps to a JS string; parse it with decimal.js, never
   into a JS number, until final display.

## Session protocol

At session start:
- Read docs/ROADMAP.md and resume from the first unchecked task.

For each task:
- Do the task, then check it off in docs/ROADMAP.md.
- Commit with a message that references the task you just finished.

At each phase boundary:
- Run typecheck and all tests.
- Update docs/ROADMAP.md.
- Commit.
- Print a 5-line status report: phase done, tasks done this session, checks
  (typecheck/tests/build) pass or fail, NEEDS HUMAN items still open, next task.
- Continue to the next phase without waiting.

NEEDS HUMAN items:
- Keep them in the NEEDS HUMAN section at the top of docs/ROADMAP.md.
- Skip them during autonomous work, leave them unchecked, and keep going.
- List the still-open ones in every status report.

The only thing the human types is "continue". Keep moving until a NEEDS HUMAN item
truly blocks all remaining work, then say exactly what the human must do.

## Project skill

Read .claude/skills/tadawul-data/SKILL.md before any work touching ingestion,
return math, corporate actions, .SR tickers, SAR money, or the trading calendar.
