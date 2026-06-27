import { createSlug, normalizePublisherName } from '@retcon/common/lib';
import { and, count, desc, eq, ilike, inArray, isNull, lt, not, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { notNil } from '../lib/notNil.js';
import { db } from './index.js';
import { cleanSearchTerm } from './lib/cleanSearchTerm.js';
import { countOrZero } from './lib/countOrZero.js';
import { first } from './lib/first.js';
import { firstOrNull } from './lib/firstOrNull.js';
import { comics, publishers, series, userComics } from './schema.js';
import type { Metadata } from './types.js';

export * from './queries/users.js';

const comicsForCount = alias(comics, 'comics_for_count');

export function getComicCount() {
  return countOrZero(db.select({ count: count() }).from(comics));
}

export function getRecentComicsForUser(userId: number, limit: number = 10) {
  return db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      slug: comics.slug,
      series: series.name,
      number: comics.number,
      volume: comics.volume,
      currentPage: userComics.currentPage,
      isRead: userComics.isRead,
      pageCount: comics.pageCount,
      publisher: publishers.name,
      lastSynced: comics.lastSynced,
    })
    .from(comics)
    .leftJoin(publishers, eq(comics.publisherId, publishers.id))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
    .orderBy(desc(comics.createdAt))
    .limit(limit);
}

export function getInProgressComics(userId: number, limit: number = 10) {
  return db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      slug: comics.slug,
      series: series.name,
      number: comics.number,
      volume: comics.volume,
      currentPage: userComics.currentPage,
      isRead: userComics.isRead,
      pageCount: comics.pageCount,
      publisher: publishers.name,
      lastSynced: comics.lastSynced,
    })
    .from(comics)
    .leftJoin(publishers, eq(comics.publisherId, publishers.id))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .innerJoin(userComics, eq(userComics.comicId, comics.id))
    .where(and(eq(userComics.userId, userId), eq(userComics.isRead, false)))
    .orderBy(desc(userComics.updatedAt))
    .limit(limit);
}

export function findComicByFileName(fileName: string) {
  return db.select().from(comics).where(eq(comics.fileName, fileName)).limit(1);
}

export function getComicByIdForUser(id: number, userId: number) {
  return firstOrNull(
    db
      .select({
        id: comics.id,
        fileName: comics.fileName,
        slug: comics.slug,
        pageCount: comics.pageCount,
        fileModified: comics.fileModified,
        lastSynced: comics.lastSynced,
        series: series.name,
        number: comics.number,
        volume: comics.volume,
        publisher: publishers.name,
        publisherSlug: publishers.slug,
        seriesId: comics.seriesId,
        seriesSlug: series.slug,
        metadata: comics.metadata,
        currentPage: userComics.currentPage,
        isRead: userComics.isRead,
        createdAt: comics.createdAt,
      })
      .from(comics)
      .leftJoin(publishers, eq(comics.publisherId, publishers.id))
      .leftJoin(series, eq(comics.seriesId, series.id))
      .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
      .where(eq(comics.id, id))
      .limit(1),
  );
}

export function insertComic(data: {
  fileName: string;
  fileModified: Date;
  lastSynced: Date;
  slug: string;
  pageCount: number;
  series?: string | null;
  number?: string | null;
  volume?: string | null;
  publisherId?: number | null;
  seriesId?: number | null;
  metadata?: Metadata;
}) {
  return db.insert(comics).values(data).returning({ insertedId: comics.id });
}

export function updateComicLastSynced(fileName: string, lastSynced: Date) {
  return db.update(comics).set({ lastSynced }).where(eq(comics.fileName, fileName));
}

export function updateComicMetadata(
  fileName: string,
  data: {
    fileModified: Date;
    lastSynced: Date;
    slug: string;
    pageCount: number;
    series?: string | null;
    number?: string | null;
    volume?: string | null;
    publisherId?: number | null;
    seriesId?: number | null;
    metadata?: Metadata;
  },
) {
  return db.update(comics).set(data).where(eq(comics.fileName, fileName));
}

export function findComicsToDelete(syncTime: Date) {
  return db.select().from(comics).where(lt(comics.lastSynced, syncTime));
}

export async function deleteComicsOlderThan(syncTime: Date) {
  return db.delete(comics).where(lt(comics.lastSynced, syncTime));
}

export async function deleteComic(comicId: number) {
  return db.delete(comics).where(eq(comics.id, comicId));
}

export async function getLastScanTime() {
  const result = await db
    .select({ lastSynced: comics.lastSynced })
    .from(comics)
    .orderBy(desc(comics.lastSynced))
    .limit(1);

  return result[0]?.lastSynced || null;
}

export function searchComics(searchTerm: string, limit: number = 25, offset: number = 0) {
  if (!searchTerm.trim()) {
    return [];
  }

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      slug: comics.slug,
      series: series.name,
      number: comics.number,
      volume: comics.volume,
      publisher: publishers.name,
      lastSynced: comics.lastSynced,
    })
    .from(comics)
    .leftJoin(publishers, eq(comics.publisherId, publishers.id))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .where(
      or(
        ilike(series.name, searchPattern),
        sql`(${series.name} || ' #' || ${comics.number}) ILIKE ${searchPattern}`,
        sql`(${series.name} || ' ' || ${comics.number}) ILIKE ${searchPattern}`,
        ilike(comics.fileName, searchPattern),
      ),
    )
    .orderBy(desc(comics.lastSynced))
    .limit(limit)
    .offset(offset);
}

export async function getPublishersWithCounts() {
  const result = await db
    .select({
      publisher: publishers.name,
      slug: publishers.slug,
      count: count(),
    })
    .from(publishers)
    .leftJoin(comics, eq(comics.publisherId, publishers.id))
    .groupBy(publishers.id, publishers.name, publishers.slug)
    .orderBy(publishers.name);

  return result.map(({ publisher, slug, count }) => ({
    publisher,
    slug,
    count,
  }));
}

export function getAllPublishers() {
  return db
    .select({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
    })
    .from(publishers)
    .orderBy(publishers.name);
}

export function getAllSeries() {
  return db
    .select({
      id: series.id,
      name: series.name,
      volume: series.volume,
      publisherId: series.publisherId,
      publisher: publishers.name,
    })
    .from(series)
    .leftJoin(publishers, eq(series.publisherId, publishers.id))
    .orderBy(series.name);
}

export function findPublisherByName(name: string) {
  return firstOrNull(
    db
      .select()
      .from(publishers)
      .where(eq(publishers.name, normalizePublisherName(name)))
      .limit(1),
  );
}

export function createPublisher(name: string) {
  const normalizedName = normalizePublisherName(name);
  const slug = createSlug(normalizedName);

  return first(
    db
      .insert(publishers)
      .values({
        name: normalizedName,
        slug,
      })
      .returning({
        id: publishers.id,
        name: publishers.name,
        slug: publishers.slug,
      }),
  );
}

/**
 * Get or create a publisher by name
 * Returns the publisher ID
 */
export async function getOrCreatePublisher(name: string): Promise<number> {
  const trimmedName = name.trim();

  // Try to find existing publisher
  const existing = await findPublisherByName(trimmedName);

  if (existing) {
    return existing.id;
  }

  // Create new publisher
  const newPublisher = await createPublisher(trimmedName);
  return newPublisher.id;
}

export function findSeriesByName(name: string, publisherId?: number) {
  const normalizedName = name.trim();

  const conditions = [eq(series.name, normalizedName)];

  // If publisherId is provided, also filter by publisher
  if (publisherId) {
    conditions.push(eq(series.publisherId, publisherId));
  }

  return firstOrNull(
    db
      .select()
      .from(series)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1),
  );
}

export function findSeriesByNameAndVolume(name: string, volume?: string, publisherId?: number) {
  const normalizedName = name.trim();

  const conditions = [eq(series.name, normalizedName)];

  if (volume) {
    conditions.push(eq(series.volume, volume));
  }

  // If publisherId is provided, also filter by publisher
  if (publisherId) {
    conditions.push(eq(series.publisherId, publisherId));
  }

  return firstOrNull(
    db
      .select()
      .from(series)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1),
  );
}

export function createSeries(name: string, volume?: string, publisherId?: number) {
  const normalizedName = name.trim();
  const slug = createSlug(normalizedName);

  return first(
    db
      .insert(series)
      .values({
        name: normalizedName,
        volume,
        slug,
        publisherId,
      })
      .returning({
        id: series.id,
        name: series.name,
        slug: series.slug,
        volume: series.volume,
        publisherId: series.publisherId,
        createdAt: series.createdAt,
      }),
  );
}

export async function getOrCreateSeries(name: string, volume?: string, publisherId?: number) {
  if (!name?.trim()) {
    return null;
  }

  // Try to find existing series
  let existingSeries = await findSeriesByNameAndVolume(name, volume, publisherId);

  // If not found, create new series
  if (!existingSeries) {
    existingSeries = await createSeries(name, volume, publisherId);
  }

  return existingSeries;
}

export async function getSeriesById(id: number) {
  const result = await db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
      publisherId: series.publisherId,
      publisher: publishers.name,
      publisherSlug: publishers.slug,
      createdAt: series.createdAt,
    })
    .from(series)
    .leftJoin(publishers, eq(series.publisherId, publishers.id))
    .where(eq(series.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getPublisherBySlug(slug: string) {
  const result = await db.select().from(publishers).where(eq(publishers.slug, slug)).limit(1);

  return result[0] || null;
}

export function getPublisherSeriesWithCounts(
  publisherId: number,
  searchTerm: string = '',
  filters: { unread?: boolean } = {},
  limit: number = 25,
  offset: number = 0,
) {
  const cleanedSearch = cleanSearchTerm(searchTerm);
  const searchPattern = `%${cleanedSearch}%`;

  const query = db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
      comicCount: count(comicsForCount.id),
      readCount: sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
      firstComicId: comics.id,
    })
    .from(series)
    .leftJoin(comicsForCount, eq(comicsForCount.seriesId, series.id))
    .leftJoin(userComics, eq(comicsForCount.id, userComics.comicId))
    .leftJoinLateral(
      db
        .select({ id: comics.id })
        .from(comics)
        .where(eq(comics.seriesId, series.id))
        .orderBy(comics.releaseDate, comics.number)
        .limit(1)
        .as('comics'),
      sql`true`,
    )
    .where(
      and(
        eq(series.publisherId, publisherId),
        sql`REGEXP_REPLACE(LOWER(${series.name}), '[^a-z0-9 ]', '', 'g') ILIKE ${searchPattern}`,
      ),
    )
    .groupBy(series.id, comics.id)
    .orderBy(series.name)
    .limit(limit)
    .offset(offset);

  if (notNil(filters?.unread)) {
    if (filters.unread) {
      query.having(
        not(
          eq(
            sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
            count(comicsForCount.id),
          ),
        ),
      );
    } else {
      query.having(
        eq(
          sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
          count(comicsForCount.id),
        ),
      );
    }
  }

  return query;
}

export function getPublisherSeriesCount(
  publisherId: number,
  searchTerm: string = '',
  filters: { unread?: boolean } = {},
) {
  const cleanedSearch = cleanSearchTerm(searchTerm);
  const searchPattern = `%${cleanedSearch}%`;

  const query = db
    .select({ count: sql<number>`count(DISTINCT ${series.id})` })
    .from(series)
    .leftJoin(comicsForCount, eq(comicsForCount.seriesId, series.id))
    .leftJoin(userComics, eq(comicsForCount.id, userComics.comicId))
    .where(
      and(
        eq(series.publisherId, publisherId),
        sql`REGEXP_REPLACE(LOWER(${series.name}), '[^a-z0-9 ]', '', 'g') ILIKE ${searchPattern}`,
      ),
    );

  if (notNil(filters?.unread)) {
    if (filters.unread) {
      query.having(
        not(
          eq(
            sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
            count(comicsForCount.id),
          ),
        ),
      );
    } else {
      query.having(
        eq(
          sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
          count(comicsForCount.id),
        ),
      );
    }
  }

  return countOrZero(query);
}

export function getPublisherComicCount(publisherId: number) {
  return countOrZero(
    db.select({ count: count() }).from(comics).where(eq(comics.publisherId, publisherId)),
  );
}

export function getSeriesComicCount(seriesId: number) {
  return countOrZero(
    db.select({ count: count() }).from(comics).where(eq(comics.seriesId, seriesId)),
  );
}

export function getSeriesComicsForUser(
  seriesId: number,
  userId: number,
  limit: number = 25,
  offset: number = 0,
) {
  return db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      slug: comics.slug,
      series: series.name,
      number: comics.number,
      volume: comics.volume,
      currentPage: userComics.currentPage,
      pageCount: comics.pageCount,
      isRead: userComics.isRead,
      metadata: comics.metadata,
      releaseDate: comics.releaseDate,
      createdAt: comics.createdAt,
    })
    .from(comics)
    .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .where(eq(comics.seriesId, seriesId))
    .orderBy(
      sql`${comics.releaseDate} nulls last`,
      sql`(case when ${comics.number} ~ '^[0-9]+$' then ${comics.number}::integer end) nulls last`,
      comics.number,
      desc(comics.createdAt),
    )
    .limit(limit)
    .offset(offset);
}

export async function getNextComicInSeries(seriesId: number, comicId: number, userId: number) {
  const ordered = await db
    .select({ id: comics.id })
    .from(comics)
    .where(eq(comics.seriesId, seriesId))
    .orderBy(
      sql`${comics.releaseDate} nulls last`,
      sql`(case when ${comics.number} ~ '^[0-9]+$' then ${comics.number}::integer end) nulls last`,
      comics.number,
      desc(comics.createdAt),
    );

  const currentIndex = ordered.findIndex((c) => c.id === comicId);
  if (currentIndex === -1 || currentIndex === ordered.length - 1) return null;

  const nextId = ordered[currentIndex + 1].id;

  return firstOrNull(
    db
      .select({
        id: comics.id,
        slug: comics.slug,
        number: comics.number,
        series: series.name,
        currentPage: userComics.currentPage,
        isRead: userComics.isRead,
      })
      .from(comics)
      .leftJoin(series, eq(comics.seriesId, series.id))
      .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
      .where(eq(comics.id, nextId))
      .limit(1),
  );
}

export function getLooseComicsCount() {
  return countOrZero(db.select({ count: count() }).from(comics).where(isNull(comics.seriesId)));
}

export function getLooseComicsForUser(userId: number, limit: number = 25, offset: number = 0) {
  return db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      slug: comics.slug,
      number: comics.number,
      volume: comics.volume,
      currentPage: userComics.currentPage,
      pageCount: comics.pageCount,
      isRead: userComics.isRead,
      metadata: comics.metadata,
      releaseDate: comics.releaseDate,
      createdAt: comics.createdAt,
    })
    .from(comics)
    .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
    .where(isNull(comics.seriesId))
    .orderBy(
      sql`${comics.releaseDate} nulls last`,
      sql`(case when ${comics.number} ~ '^[0-9]+$' then ${comics.number}::integer end) nulls last`,
      comics.number,
      desc(comics.createdAt),
    )
    .limit(limit)
    .offset(offset);
}

export async function getSeriesReadStatus(seriesId: number, userId: number) {
  const result = await db
    .select({
      totalComics: count(comics.id),
      readComics: sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
    })
    .from(comics)
    .leftJoin(userComics, and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)))
    .where(eq(comics.seriesId, seriesId));

  const totalComics = result[0]?.totalComics ?? 0;
  const readComics = Number(result[0]?.readComics ?? 0);
  return {
    totalComics,
    readComics,
    allRead: totalComics > 0 && readComics === totalComics,
    noneRead: readComics === 0,
  };
}

export function upsertUserComicProgress(
  userId: number,
  comicId: number,
  currentPage: number,
  isRead: boolean = false,
) {
  return db
    .insert(userComics)
    .values({
      userId,
      comicId,
      currentPage,
      isRead,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userComics.userId, userComics.comicId],
      set: {
        currentPage,
        isRead,
        updatedAt: new Date(),
      },
    });
}

export function markComicAsRead(userId: number, comicId: number) {
  return db
    .insert(userComics)
    .values({
      userId,
      comicId,
      currentPage: 1,
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userComics.userId, userComics.comicId],
      set: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
}

export async function markSeriesAsRead(userId: number, seriesId: number) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const seriesComics = await tx
      .select({ id: comics.id })
      .from(comics)
      .where(eq(comics.seriesId, seriesId));

    if (seriesComics.length === 0) return;

    return tx
      .insert(userComics)
      .values(
        seriesComics.map(({ id }) => ({
          userId,
          comicId: id,
          isRead: true,
          currentPage: 1,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [userComics.userId, userComics.comicId],
        set: { isRead: true, updatedAt: now },
      });
  });
}

export function deleteUserComicRecord(userId: number, comicId: number) {
  return db
    .delete(userComics)
    .where(and(eq(userComics.userId, userId), eq(userComics.comicId, comicId)));
}

export function deleteUserSeriesRecords(userId: number, seriesId: number) {
  return db
    .delete(userComics)
    .where(
      and(
        eq(userComics.userId, userId),
        inArray(
          userComics.comicId,
          db.select({ id: comics.id }).from(comics).where(eq(comics.seriesId, seriesId)),
        ),
      ),
    );
}

export function deleteEmptySeries() {
  return db
    .delete(series)
    .where(not(sql`EXISTS (SELECT 1 FROM ${comics} WHERE ${comics.seriesId} = ${series.id})`))
    .returning({ deletedId: series.id });
}

export function deleteEmptyPublishers() {
  return db
    .delete(publishers)
    .where(
      not(sql`EXISTS (SELECT 1 FROM ${comics} WHERE ${comics.publisherId} = ${publishers.id})`),
    )
    .returning({ deletedId: publishers.id });
}

function buildUnreadSeriesFilter(searchTerm: string, publisherId?: number) {
  return and(
    sql`REGEXP_REPLACE(LOWER(${series.name}), '[^a-z0-9 ]', '', 'g') ILIKE ${`%${cleanSearchTerm(searchTerm)}%`}`,
    publisherId ? eq(series.publisherId, publisherId) : undefined,
  );
}

const hasUnreadComics = not(
  eq(
    sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
    count(comicsForCount.id),
  ),
);

export function findUnreadSeriesForUser(
  userId: number,
  searchTerm: string = '',
  limit: number = 25,
  offset: number = 0,
  publisherId?: number,
) {
  return db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
      comicCount: count(comicsForCount.id),
      readCount: sql<number>`count(${userComics.isRead}) filter (where ${userComics.isRead} = true)`,
      firstComicId: comics.id,
    })
    .from(series)
    .leftJoin(comicsForCount, eq(comicsForCount.seriesId, series.id))
    .leftJoin(
      userComics,
      and(eq(comicsForCount.id, userComics.comicId), eq(userComics.userId, userId)),
    )
    .leftJoinLateral(
      db
        .select({ id: comics.id })
        .from(comics)
        .where(eq(comics.seriesId, series.id))
        .orderBy(comics.releaseDate, comics.number)
        .limit(1)
        .as('comics'),
      sql`true`,
    )
    .where(buildUnreadSeriesFilter(searchTerm, publisherId))
    .groupBy(series.id, comics.id)
    .having(hasUnreadComics)
    .orderBy(series.name)
    .limit(limit)
    .offset(offset);
}

export function countUnreadSeriesForUser(
  userId: number,
  searchTerm: string = '',
  publisherId?: number,
) {
  const subquery = db
    .select({ id: series.id })
    .from(series)
    .leftJoin(comicsForCount, eq(comicsForCount.seriesId, series.id))
    .leftJoin(
      userComics,
      and(eq(comicsForCount.id, userComics.comicId), eq(userComics.userId, userId)),
    )
    .where(buildUnreadSeriesFilter(searchTerm, publisherId))
    .groupBy(series.id)
    .having(hasUnreadComics)
    .as('unread_series');

  return countOrZero(db.select({ count: count() }).from(subquery));
}

/**
 * Get a comic by ID (without user-specific data)
 */
export function getComicById(id: number) {
  return firstOrNull(
    db
      .select({
        id: comics.id,
        fileName: comics.fileName,
        slug: comics.slug,
        fileModified: comics.fileModified,
        lastSynced: comics.lastSynced,
        number: comics.number,
        volume: comics.volume,
        pageCount: comics.pageCount,
        publisherId: comics.publisherId,
        seriesId: comics.seriesId,
        series: series.name,
        metadata: comics.metadata,
        releaseDate: comics.releaseDate,
        createdAt: comics.createdAt,
      })
      .from(comics)
      .leftJoin(series, eq(comics.seriesId, series.id))
      .where(eq(comics.id, id)),
  );
}

export function updateComicPageCount(comicId: number, pageCount: number) {
  return db.update(comics).set({ pageCount }).where(eq(comics.id, comicId));
}

/**
 * Update comic metadata fields including publisher and series IDs
 */
export async function updateComicMetadataFields(
  comicId: number,
  updates: {
    number?: string | null;
    volume?: string | null;
    releaseDate?: string | null;
    metadata?: Metadata;
    publisherId?: number | null;
    seriesId?: number | null;
  },
) {
  return db
    .update(comics)
    .set({
      ...updates,
      lastSynced: new Date(),
    })
    .where(eq(comics.id, comicId));
}
