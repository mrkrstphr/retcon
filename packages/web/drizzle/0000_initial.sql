CREATE TABLE IF NOT EXISTS "comics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_modified" timestamp NOT NULL,
	"last_synced" timestamp NOT NULL,
	"number" varchar(50),
	"volume" varchar(50),
	"publisher_id" bigint,
	"series_id" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publishers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_name_unique" UNIQUE("name"),
	CONSTRAINT "publishers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"slug" varchar(300) NOT NULL,
	"publisher_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comics" ADD CONSTRAINT "comics_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comics" ADD CONSTRAINT "comics_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series" ADD CONSTRAINT "series_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
