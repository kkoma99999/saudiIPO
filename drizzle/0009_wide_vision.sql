CREATE TABLE "live_quotes" (
	"symbol" varchar(16) PRIMARY KEY NOT NULL,
	"price" numeric(14, 4) NOT NULL,
	"change" numeric(14, 4),
	"change_percent" numeric(8, 4),
	"previous_close" numeric(14, 4),
	"quote_time" timestamp with time zone NOT NULL,
	"is_delayed" boolean DEFAULT true NOT NULL,
	"source" varchar(16) DEFAULT 'sahmk' NOT NULL,
	"source_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
