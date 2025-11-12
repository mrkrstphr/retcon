import {
  bigint,
  bigserial,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import type { Metadata } from './types';

export const publishers = pgTable('publishers', {
  id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
  name: varchar('name', { length: 200 }).notNull().unique(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const series = pgTable('series', {
  id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
  name: varchar('name', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  publisherId: bigint('publisher_id', { mode: 'number' }).references(
    () => publishers.id,
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comics = pgTable('comics', {
  id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileModified: timestamp('file_modified').notNull(),
  lastSynced: timestamp('last_synced').notNull(),
  number: varchar('number', { length: 50 }),
  volume: varchar('volume', { length: 50 }),
  publisherId: bigint('publisher_id', { mode: 'number' }).references(
    () => publishers.id,
  ),
  seriesId: bigint('series_id', { mode: 'number' }).references(() => series.id),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
