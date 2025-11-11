-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint

-- Add new uuid column
ALTER TABLE "comics" ADD COLUMN "uuid" uuid DEFAULT gen_random_uuid();--> statement-breakpoint

-- Drop the old id column
ALTER TABLE "comics" DROP COLUMN "id";--> statement-breakpoint

-- Rename uuid column to id
ALTER TABLE "comics" RENAME COLUMN "uuid" TO "id";--> statement-breakpoint

-- Add primary key constraint
ALTER TABLE "comics" ADD PRIMARY KEY ("id");