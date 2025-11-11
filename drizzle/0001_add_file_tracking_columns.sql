ALTER TABLE "comics" ADD COLUMN "file_name" varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "file_modified" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "comics" ADD COLUMN "last_synced" timestamp NOT NULL;