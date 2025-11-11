import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const comics = pgTable('comics', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileModified: timestamp('file_modified').notNull(),
  lastSynced: timestamp('last_synced').notNull(),
  series: varchar('series', { length: 300 }),
  number: varchar('number', { length: 50 }),
  volume: varchar('volume', { length: 50 }),
  publisher: varchar('publisher', { length: 200 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
