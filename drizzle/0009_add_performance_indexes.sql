CREATE INDEX "comics_series_id_idx" ON "comics" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "comics_publisher_id_idx" ON "comics" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "series_publisher_id_idx" ON "series" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "user_comics_user_id_idx" ON "user_comics" USING btree ("user_id");
