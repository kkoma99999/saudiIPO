# Saudi TASI IPO Tracker

A website tracking every Saudi Main Market (TASI) IPO from January 2018 to today,
roughly 75 to 90 companies. No Nomu. For each company it shows the offer price, the
current price, the return since IPO adjusted for bonus issues and splits, the first
five trading days return, the full dividend history, the dividend yield on the offer
price, and performance versus the TASI index. The audience is Saudi retail investors.
The UI ships in English and Arabic (RTL) with a per-session language switch.

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

## Deploy (Vercel + Neon)

Most of this is one-time setup a person does. The matching NEEDS HUMAN items in
docs/ROADMAP.md track it.

### 1. Neon Postgres (NEEDS HUMAN)

- Create a Neon project and a database.
- Copy the pooled connection string for the app, and a direct (non-pooled) string
  for migrations and the cron job per Neon's guidance.

### 2. GitHub secret (NEEDS HUMAN)

- Repo Settings, then Secrets and variables, then Actions, then New repository
  secret.
- Name it DATABASE_URL with the Neon connection string the cron should use.

### 3. Vercel project (NEEDS HUMAN)

- Import this repo into Vercel.
- Set DATABASE_URL and NEXT_PUBLIC_SITE_URL in Project Settings, Environment
  Variables, for Production (and Preview if you want preview data).
- Deploy.

### 4. Run migrations against Neon

- With DATABASE_URL pointing at Neon, run `npm run db:migrate`.
- Confirm the tables exist.

### 5. Seed and backfill

- Load data/ipos.csv, then run `python scripts/backfill.py` once against Neon.

### 6. Confirm the cron

- The daily-ingest workflow runs `30 12 * * 0-4` (Sunday to Thursday, 12:30 UTC).
- Trigger it once by hand from the Actions tab (workflow_dispatch) to confirm it
  writes rows and an ingest_log entry.

## Progress

docs/ROADMAP.md is the single source of truth for what is built and what is next.
