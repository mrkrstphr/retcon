ALTER TABLE "comics" ADD COLUMN "release_date" varchar(10);

UPDATE comics
SET release_date =
    CASE WHEN LENGTH(metadata->>'releaseDate') = 7 THEN (metadata->>'releaseDate' || '-01')
    WHEN LENGTH(metadata->>'releaseDate') = 10 THEN (metadata->>'releaseDate')
    ELSE NULL END;
