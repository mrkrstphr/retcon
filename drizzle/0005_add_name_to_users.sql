-- Add name column as nullable first
ALTER TABLE "users" ADD COLUMN "name" varchar(36);

-- Populate name with email prefix for existing users
UPDATE "users" SET "name" = SPLIT_PART("email", '@', 1);

-- Make name column not null
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;