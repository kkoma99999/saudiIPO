import {
  pgTable,
  pgEnum,
  serial,
  char,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  integer,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Money columns are numeric (Drizzle maps numeric to a JS string). Never read them
// as JS numbers. Parse with decimal.js in the metrics layer and round to halala
// precision only at display time. See .claude/skills/tadawul-data/SKILL.md.

// Bonus issues, splits, and par-value changes all multiply the share count, so the
// math treats them the same; the factor is what the math uses. type stays for back
// compatibility; kind carries the richer classification.
export const actionType = pgEnum("action_type", ["split", "bonus"]);

// The standard mandate types on a Saudi IPO. role is informational; one IPO can carry
// the same firm in more than one role (for example lead manager and receiving agent).
export const advisorRole = pgEnum("advisor_role", [
  "underwriter",
  "financial_advisor",
  "lead_manager",
  "bookrunner",
  "receiving_agent",
]);

// companies: one row per listed company. Symbol is the bare 4-digit code.
export const companies = pgTable(
  "companies",
  {
    symbol: char("symbol", { length: 4 }).primaryKey(),
    nameEn: varchar("name_en", { length: 256 }).notNull(),
    nameAr: varchar("name_ar", { length: 256 }),
    sector: varchar("sector", { length: 128 }),
    // Free-form caveat shown as a badge, for example a rights issue we do not model
    // or a known yfinance series problem. Null when there is nothing to flag.
    dataCaveat: text("data_caveat"),
    listingDate: date("listing_date"),
    // Denormalized convenience, for example 2222.SR. Avoids rebuilding the ticker.
    yahooTicker: varchar("yahoo_ticker", { length: 16 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("companies_sector_idx").on(t.sector)],
);

// ipos: the IPO event for a company. One per company (unique on symbol).
export const ipos = pgTable(
  "ipos",
  {
    id: serial("id").primaryKey(),
    symbol: char("symbol", { length: 4 })
      .notNull()
      .references(() => companies.symbol),
    offerPrice: numeric("offer_price", { precision: 12, scale: 4 }).notNull(),
    // Par value (القيمة الاسمية) in SAR per share. Standard TASI par is 10, but it
    // is verified per company and left null when not confirmed from a source.
    nominalValue: numeric("nominal_value", { precision: 12, scale: 4 }),
    sharesOffered: bigint("shares_offered", { mode: "bigint" }),
    proceedsSar: numeric("proceeds_sar", { precision: 20, scale: 2 }),
    oversubscription: numeric("oversubscription", { precision: 8, scale: 2 }),
    // Per-share figures taken from the نشرة الإصدار (prospectus) to value the offer.
    // recurringEpsTtm is recurring earnings per share over the trailing twelve months
    // (or the latest audited year) before listing; bookValuePerShare is shareholders'
    // equity per share at the latest balance sheet in the prospectus. The offer-price
    // P/E and P/B are computed from these and the offer price in the metrics layer,
    // never for today and never adjusted for later actions. valuation_source_url is
    // the prospectus. All left null until sourced; nothing is invented.
    recurringEpsTtm: numeric("recurring_eps_ttm", { precision: 14, scale: 4 }),
    bookValuePerShare: numeric("book_value_per_share", { precision: 14, scale: 4 }),
    valuationSourceUrl: text("valuation_source_url"),
    // Allocation and subscription facts from the Tadawul allotment announcement (the
    // announcement of subscription and allotment results) and Argaam. Static, set once
    // at the IPO, and not in yfinance. All nullable: a company that does not disclose a
    // field leaves it null, never guessed. min_allocation_shares is the guaranteed
    // minimum shares per individual subscriber and drives the retail outcome calculator.
    // allocation_factor is the published pro-rata allocation rate (نسبة التخصيص التناسبية),
    // a percent applied to the shares an individual requested ABOVE the guaranteed minimum.
    // allocation_verified stays false until a human checks the row against
    // allocation_source_url.
    retailTranchePct: numeric("retail_tranche_pct", { precision: 7, scale: 4 }),
    retailSharesOffered: numeric("retail_shares_offered", { precision: 20, scale: 4 }),
    minAllocationShares: numeric("min_allocation_shares", { precision: 20, scale: 4 }),
    individualSubscribersCount: integer("individual_subscribers_count"),
    retailCoverageMultiple: numeric("retail_coverage_multiple", { precision: 12, scale: 4 }),
    institutionalCoverageMultiple: numeric("institutional_coverage_multiple", {
      precision: 12,
      scale: 4,
    }),
    allocationFactor: numeric("allocation_factor", { precision: 12, scale: 8 }),
    retailSubscriptionStart: date("retail_subscription_start"),
    retailSubscriptionEnd: date("retail_subscription_end"),
    allocationSourceUrl: text("allocation_source_url"),
    allocationVerified: boolean("allocation_verified").notNull().default(false),
    ipoDate: date("ipo_date").notNull(),
    sourceUrl: text("source_url").notNull(),
    // Stays false until a human verifies the row against its source.
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ipos_symbol_uq").on(t.symbol),
    index("ipos_ipo_date_idx").on(t.ipoDate),
  ],
);

// ipo_advisors: the banks and advisors on an IPO. One IPO has many, so this is a
// separate table keyed on symbol like the other per-company tables. Sourced from the
// allotment announcement and the نشرة الإصدار (prospectus); source_url is required.
export const ipoAdvisors = pgTable(
  "ipo_advisors",
  {
    id: serial("id").primaryKey(),
    symbol: char("symbol", { length: 4 })
      .notNull()
      .references(() => companies.symbol),
    name: text("name").notNull(),
    role: advisorRole("role").notNull(),
    sourceUrl: text("source_url").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ipo_advisors_symbol_name_role_uq").on(t.symbol, t.name, t.role),
    index("ipo_advisors_symbol_idx").on(t.symbol),
  ],
);

// prices_daily: daily OHLC from yfinance with auto_adjust=False. The close is
// SPLIT and bonus adjusted by yfinance to current-share basis (not raw, and not
// dividend adjusted). adj_close is Yahoo's split+dividend adjusted close, kept only
// as a cross-check; our return math does not use it. See the tadawul-data skill.
export const pricesDaily = pgTable(
  "prices_daily",
  {
    id: serial("id").primaryKey(),
    symbol: char("symbol", { length: 4 })
      .notNull()
      .references(() => companies.symbol),
    date: date("date").notNull(),
    open: numeric("open", { precision: 14, scale: 4 }),
    high: numeric("high", { precision: 14, scale: 4 }),
    low: numeric("low", { precision: 14, scale: 4 }),
    close: numeric("close", { precision: 14, scale: 4 }).notNull(),
    adjClose: numeric("adj_close", { precision: 18, scale: 8 }),
    volume: bigint("volume", { mode: "bigint" }),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("prices_symbol_date_uq").on(t.symbol, t.date),
    index("prices_symbol_idx").on(t.symbol),
  ],
);

// dividends: raw per-share cash dividends. source is in the unique key so a
// saudiexchange correction can coexist with the yahoo row.
export const dividends = pgTable(
  "dividends",
  {
    id: serial("id").primaryKey(),
    symbol: char("symbol", { length: 4 })
      .notNull()
      .references(() => companies.symbol),
    exDate: date("ex_date").notNull(),
    amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("yahoo"),
    verified: boolean("verified").notNull().default(false),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("dividends_symbol_exdate_src_uq").on(t.symbol, t.exDate, t.source),
    index("dividends_symbol_idx").on(t.symbol),
  ],
);

// corporate_actions: splits and bonus issues. factor is the share multiplier:
// a 1-for-5 bonus is 1.20, a 2-for-1 split is 2.00.
export const corporateActions = pgTable(
  "corporate_actions",
  {
    id: serial("id").primaryKey(),
    symbol: char("symbol", { length: 4 })
      .notNull()
      .references(() => companies.symbol),
    actionDate: date("action_date").notNull(),
    type: actionType("type").notNull().default("split"),
    // bonus | split | par_change | rights | other. Informational; factor drives math.
    kind: varchar("kind", { length: 16 }).notNull().default("split"),
    factor: numeric("factor", { precision: 18, scale: 8 }).notNull(),
    ratioText: varchar("ratio_text", { length: 64 }),
    source: varchar("source", { length: 32 }).notNull().default("yahoo"),
    sourceUrl: text("source_url"),
    verified: boolean("verified").notNull().default(false),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ca_symbol_date_uq").on(t.symbol, t.actionDate),
    index("ca_symbol_idx").on(t.symbol),
  ],
);

// index_prices: the TASI index (^TASI.SR) closes for same-window comparison. No
// company foreign key because the index is not a company.
export const indexPrices = pgTable(
  "index_prices",
  {
    id: serial("id").primaryKey(),
    indexSymbol: varchar("index_symbol", { length: 16 }).notNull().default("^TASI.SR"),
    date: date("date").notNull(),
    close: numeric("close", { precision: 18, scale: 8 }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("index_prices_symbol_date_uq").on(t.indexSymbol, t.date)],
);

// live_quotes: the latest delayed (or real-time) quote per symbol from the Sahmk API
// (sahmk.sa), refreshed once daily by scripts/live_prices.py. This is the dynamic
// current-price source. It is deliberately separate from prices_daily (the yfinance
// end-of-day history that drives the chart): the app prefers this price for the
// headline current price and the returns, and falls back to the latest prices_daily
// close when a symbol has no live quote. symbol is varchar(16), not a company foreign
// key, so the TASI index level (symbol 'TASI') lives here too. quote_time is the
// source's own updated_at; nothing here is invented. See the tadawul-data skill.
// change, change_percent, and previous_close are stored for provenance and are not read
// by the app yet; the return math uses only price, quote_time, and is_delayed.
export const liveQuotes = pgTable("live_quotes", {
  symbol: varchar("symbol", { length: 16 }).primaryKey(),
  price: numeric("price", { precision: 14, scale: 4 }).notNull(),
  change: numeric("change", { precision: 14, scale: 4 }),
  changePercent: numeric("change_percent", { precision: 8, scale: 4 }),
  previousClose: numeric("previous_close", { precision: 14, scale: 4 }),
  quoteTime: timestamp("quote_time", { withTimezone: true }).notNull(),
  isDelayed: boolean("is_delayed").notNull().default(true),
  source: varchar("source", { length: 16 }).notNull().default("sahmk"),
  sourceUrl: text("source_url"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

// ingest_log: every run outcome, success and failure. No foreign key on symbol so
// failures for unknown symbols still log.
export const ingestLog = pgTable(
  "ingest_log",
  {
    id: serial("id").primaryKey(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    runId: varchar("run_id", { length: 36 }),
    symbol: char("symbol", { length: 4 }),
    source: varchar("source", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    message: text("message"),
    rowsWritten: integer("rows_written").notNull().default(0),
  },
  (t) => [
    index("ingest_symbol_idx").on(t.symbol),
    index("ingest_status_idx").on(t.status),
    index("ingest_runid_idx").on(t.runId),
  ],
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Ipo = typeof ipos.$inferSelect;
export type NewIpo = typeof ipos.$inferInsert;
export type IpoAdvisor = typeof ipoAdvisors.$inferSelect;
export type NewIpoAdvisor = typeof ipoAdvisors.$inferInsert;
export type PriceDaily = typeof pricesDaily.$inferSelect;
export type Dividend = typeof dividends.$inferSelect;
export type CorporateAction = typeof corporateActions.$inferSelect;
export type IndexPrice = typeof indexPrices.$inferSelect;
// The raw live_quotes row. Named LiveQuoteRow so it does not collide with the LiveQuote
// DTO in src/lib/quote-select.ts, which carries only the fields the return math reads.
export type LiveQuoteRow = typeof liveQuotes.$inferSelect;
export type IngestLogRow = typeof ingestLog.$inferSelect;
