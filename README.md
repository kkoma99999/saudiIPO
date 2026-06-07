# Saudi TASI IPO Tracker

A website tracking every Saudi Main Market (TASI) IPO from December 2019 to today,
roughly 75 to 90 companies. No Nomu. For each company it shows the offer price, the
current price, the return since IPO adjusted for bonus issues and splits, the full
dividend history, the dividend yield on the offer price, and performance versus the
TASI index. The audience is Saudi retail investors. The UI is English now and is
structured so Arabic and RTL can be added later.

This is informational only. It is not investment advice.

## Stack

- Next.js 16 App Router, TypeScript strict, Tailwind 4, shadcn/ui, Recharts
- Drizzle ORM on Postgres (Neon in production, Docker Postgres locally)
- Python 3.12 plus yfinance for ingestion, in scripts/
- GitHub Actions for the daily cron, Vercel as the deploy target

## Data honesty

- Market data is never fabricated. A missing value stays empty and gets a row in
  ingest_log.
- Every IPO row carries a source_url.
- Every IPO row stays verified=false until a human checks it against the source and
  flips it. The UI shows an unverified badge on those rows.
- Bonus issues and splits go into corporate_actions and all return math uses the
  adjusted offer price.

## Local development

Prerequisites: Node 20+, Docker, Python 3.12.

```bash
# 1. install JS deps
npm install

# 2. start local Postgres
docker compose up -d

# 3. copy env and point it at local Postgres
cp .env.example .env

# 4. apply the database schema
npm run db:migrate

# 5. run the app
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` start the dev server
- `npm run build` production build
- `npm run typecheck` TypeScript check, no emit
- `npm test` run the Vitest unit tests
- `npm run db:generate` generate a Drizzle migration from the schema
- `npm run db:migrate` apply migrations
- `npm run db:push` push the schema straight to the database (dev convenience)
- `npm run validate:ipos` validate data/ipos.csv structure

## Ingestion (Python)

```bash
cd scripts
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
python backfill.py          # full history
python daily.py             # incremental, run by the daily cron
```

## Deploy

See the Deploy section added in Phase 6 for the Vercel and Neon setup steps. The
account creation and secret setup are tracked as NEEDS HUMAN items in
docs/ROADMAP.md.

## Progress

docs/ROADMAP.md is the single source of truth for what is built and what is next.
