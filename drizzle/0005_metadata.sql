ALTER TABLE "comics" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "comics" ALTER COLUMN "metadata" SET NOT NULL;