CREATE TYPE "public"."action_type" AS ENUM('split', 'bonus');--> statement-breakpoint
CREATE TABLE "companies" (
	"symbol" char(4) PRIMARY KEY NOT NULL,
	"name_en" varchar(256) NOT NULL,
	"name_ar" varchar(256),
	"sector" varchar(128),
	"listing_date" date,
	"yahoo_ticker" varchar(16) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" char(4) NOT NULL,
	"action_date" date NOT NULL,
	"type" "action_type" DEFAULT 'split' NOT NULL,
	"factor" numeric(18, 8) NOT NULL,
	"ratio_text" varchar(32),
	"source" varchar(32) DEFAULT 'yahoo' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dividends" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" char(4) NOT NULL,
	"ex_date" date NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"source" varchar(32) DEFAULT 'yahoo' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "index_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"index_symbol" varchar(16) DEFAULT '^TASI.SR' NOT NULL,
	"date" date NOT NULL,
	"close" numeric(18, 8) NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"run_id" varchar(36),
	"symbol" char(4),
	"source" varchar(32) NOT NULL,
	"status" varchar(16) NOT NULL,
	"message" text,
	"rows_written" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" char(4) NOT NULL,
	"offer_price" numeric(12, 4) NOT NULL,
	"shares_offered" bigint,
	"proceeds_sar" numeric(20, 2),
	"oversubscription" numeric(8, 2),
	"ipo_date" date NOT NULL,
	"source_url" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" char(4) NOT NULL,
	"date" date NOT NULL,
	"open" numeric(14, 4),
	"high" numeric(14, 4),
	"low" numeric(14, 4),
	"close" numeric(14, 4) NOT NULL,
	"adj_close" numeric(18, 8),
	"volume" bigint,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_symbol_companies_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."companies"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_symbol_companies_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."companies"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipos" ADD CONSTRAINT "ipos_symbol_companies_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."companies"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices_daily" ADD CONSTRAINT "prices_daily_symbol_companies_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."companies"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_sector_idx" ON "companies" USING btree ("sector");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_symbol_date_uq" ON "corporate_actions" USING btree ("symbol","action_date");--> statement-breakpoint
CREATE INDEX "ca_symbol_idx" ON "corporate_actions" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "dividends_symbol_exdate_src_uq" ON "dividends" USING btree ("symbol","ex_date","source");--> statement-breakpoint
CREATE INDEX "dividends_symbol_idx" ON "dividends" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "index_prices_symbol_date_uq" ON "index_prices" USING btree ("index_symbol","date");--> statement-breakpoint
CREATE INDEX "ingest_symbol_idx" ON "ingest_log" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "ingest_status_idx" ON "ingest_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ingest_runid_idx" ON "ingest_log" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ipos_symbol_uq" ON "ipos" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "ipos_ipo_date_idx" ON "ipos" USING btree ("ipo_date");--> statement-breakpoint
CREATE UNIQUE INDEX "prices_symbol_date_uq" ON "prices_daily" USING btree ("symbol","date");--> statement-breakpoint
CREATE INDEX "prices_symbol_idx" ON "prices_daily" USING btree ("symbol");