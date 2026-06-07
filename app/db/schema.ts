import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import type { Metadata } from './types';

export const publishers = pgTable('publishers', {
  id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
  name: varchar('name', { length: 200 }).notNull().unique(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const series = pgTable(
  'series',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
    name: varchar('name', { length: 300 }).notNull(),
    volume: varchar('volume', { length: 50 }),
    slug: varchar('slug', { length: 300 }).notNull(),
    publisherId: bigint('publisher_id', { mode: 'number' }).references(
      () => publishers.id,
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('series_publisher_id_idx').on(t.publisherId)],
);

export const comics = pgTable(
  'comics',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileModified: timestamp('file_modified').notNull(),
    lastSynced: timestamp('last_synced').notNull(),
    slug: varchar('slug', { length: 400 }).notNull(),
    number: varchar('number', { length: 50 }),
    volume: varchar('volume', { length: 50 }),
    pageCount: integer('page_count').default(0).notNull(),
    publisherId: bigint('publisher_id', { mode: 'number' }).references(
      () => publishers.id,
    ),
    seriesId: bigint('series_id', { mode: 'number' }).references(() => series.id),
    metadata: jsonb('metadata').$type<Metadata>().notNull().default({}),
    releaseDate: varchar('release_date', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('comics_series_id_idx').on(t.seriesId),
    index('comics_publisher_id_idx').on(t.publisherId),
  ],
);

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userComics = pgTable(
  'user_comics',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey().notNull(),
    userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
    comicId: bigint('comic_id', { mode: 'number' }).references(() => comics.id),
    isRead: boolean('is_read').default(false).notNull(),
    currentPage: integer('current_page').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.comicId),
    index('user_comics_user_id_idx').on(t.userId),
  ],
);
