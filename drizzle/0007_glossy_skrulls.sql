CREATE TYPE "public"."advisor_role" AS ENUM('underwriter', 'financial_advisor', 'lead_manager', 'bookrunner', 'receiving_agent');--> statement-breakpoint
CREATE TABLE "ipo_advisors" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" char(4) NOT NULL,
	"name" text NOT NULL,
	"role" "advisor_role" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "retail_tranche_pct" numeric(7, 4);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "retail_shares_offered" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "min_allocation_shares" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "allocation_method" text;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "prorata_basis" text;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "individual_subscribers_count" integer;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "retail_coverage_multiple" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "institutional_coverage_multiple" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "allocation_factor" numeric(12, 8);--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "retail_subscription_start" date;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "retail_subscription_end" date;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "allocation_source_url" text;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "allocation_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ipo_advisors" ADD CONSTRAINT "ipo_advisors_symbol_companies_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."companies"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ipo_advisors_symbol_name_role_uq" ON "ipo_advisors" USING btree ("symbol","name","role");--> statement-breakpoint
CREATE INDEX "ipo_advisors_symbol_idx" ON "ipo_advisors" USING btree ("symbol");