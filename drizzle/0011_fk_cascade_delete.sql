ALTER TABLE "comics" DROP CONSTRAINT "comics_publisher_id_publishers_id_fk";
--> statement-breakpoint
ALTER TABLE "comics" DROP CONSTRAINT "comics_series_id_series_id_fk";
--> statement-breakpoint
ALTER TABLE "series" DROP CONSTRAINT "series_publisher_id_publishers_id_fk";
--> statement-breakpoint
ALTER TABLE "comics" ADD CONSTRAINT "comics_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comics" ADD CONSTRAINT "comics_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;