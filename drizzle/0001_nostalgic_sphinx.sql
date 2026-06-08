ALTER TABLE "corporate_actions" ADD COLUMN "kind" varchar(16) DEFAULT 'split' NOT NULL;--> statement-breakpoint
ALTER TABLE "ipos" ADD COLUMN "nominal_value" numeric(12, 4);