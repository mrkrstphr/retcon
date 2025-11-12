import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { Metadata } from './types';

export const publishers = pgTable('publishers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull().unique(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 300 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull(),
  publisherId: uuid('publisher_id').references(() => publishers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comics = pgTable('comics', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileModified: timestamp('file_modified').notNull(),
  lastSynced: timestamp('last_synced').notNull(),
  number: varchar('number', { length: 50 }),
  volume: varchar('volume', { length: 50 }),
  publisherId: uuid('publisher_id').references(() => publishers.id),
  seriesId: uuid('series_id').references(() => series.id),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
