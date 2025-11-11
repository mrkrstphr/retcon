ALTER TABLE "comics" ADD COLUMN "series" varchar(300);--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "number" varchar(50);--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "volume" varchar(50);--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "publisher" varchar(200);--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "metadata" jsonb;