ALTER TABLE "corporate_actions" ALTER COLUMN "ratio_text" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD COLUMN "source_url" text;