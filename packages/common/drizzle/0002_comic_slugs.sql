ALTER TABLE "comics" ADD COLUMN "slug" varchar(400);
--> statement-breakpoint

UPDATE comics SET slug = (
  SELECT s.slug || '-' || LOWER(REGEXP_REPLACE(comics.number, '[^a-zA-Z0-9]', '-', 'g'))
  FROM series s
  WHERE s.id = comics.series_id
  AND s.slug IS NOT NULL
)
WHERE number IS NOT NULL
AND series_id IS NOT NULL
AND slug IS NULL;
--> statement-breakpoint

ALTER TABLE "comics" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
