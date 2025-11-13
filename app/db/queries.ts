import { and, count, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';
import { createSlug, normalizePublisherName } from '../lib/slugs.js';
import { db } from './index.js';
import { comics, publishers, series, userComics } from './schema.js';

export async function getComicCount() {
  const result = await db.select({ count: count() }).from(comics);

  return result[0]?.count || 0;
}

export async function getRecentComics(limit: number = 10) {
  return await db
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
    .orderBy(desc(comics.createdAt))
    .limit(limit);
}

export async function findComicByFileName(fileName: string) {
  return await db
    .select()
    .from(comics)
    .where(eq(comics.fileName, fileName))
    .limit(1);
}

export async function getComicById(id: number) {
  const result = await db
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
      metadata: comics.metadata,
      currentPage: userComics.currentPage,
      isRead: userComics.isRead,
      createdAt: comics.createdAt,
    })
    .from(comics)
    .leftJoin(publishers, eq(comics.publisherId, publishers.id))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .leftJoin(userComics, eq(userComics.comicId, comics.id))
    .where(eq(comics.id, id))
    .limit(1);

  return result[0] || null;
}

export async function insertComic(data: {
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
  metadata?: any;
}) {
  return await db
    .insert(comics)
    .values(data)
    .returning({ insertedId: comics.id });
}

export async function updateComicLastSynced(
  fileName: string,
  lastSynced: Date,
) {
  return await db
    .update(comics)
    .set({ lastSynced })
    .where(eq(comics.fileName, fileName));
}

export async function updateComicMetadata(
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
    metadata?: any;
  },
) {
  return await db.update(comics).set(data).where(eq(comics.fileName, fileName));
}

export async function findComicsToDelete(syncTime: Date) {
  return await db.select().from(comics).where(lt(comics.lastSynced, syncTime));
}

export async function deleteComicsOlderThan(syncTime: Date) {
  return await db.delete(comics).where(lt(comics.lastSynced, syncTime));
}

export async function getLastScanTime() {
  const result = await db
    .select({ lastSynced: comics.lastSynced })
    .from(comics)
    .orderBy(desc(comics.lastSynced))
    .limit(1);

  return result[0]?.lastSynced || null;
}

export async function searchComics(
  searchTerm: string,
  limit: number = 25,
  offset: number = 0,
) {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate async delay
  if (!searchTerm.trim()) {
    return [];
  }

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return await db
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
        ilike(comics.fileName, searchPattern),
        ilike(publishers.name, searchPattern),
      ),
    )
    .orderBy(desc(comics.lastSynced))
    .limit(limit)
    .offset(offset);
}

export async function getSearchCount(searchTerm: string) {
  if (!searchTerm.trim()) {
    return 0;
  }

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  const result = await db
    .select({ count: count() })
    .from(comics)
    .leftJoin(publishers, eq(comics.publisherId, publishers.id))
    .leftJoin(series, eq(comics.seriesId, series.id))
    .where(
      or(
        ilike(series.name, searchPattern),
        ilike(comics.fileName, searchPattern),
        ilike(publishers.name, searchPattern),
      ),
    );

  return result[0]?.count || 0;
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
    .orderBy(desc(count()), publishers.name);

  return result.map(({ publisher, slug, count }) => ({
    publisher,
    slug,
    count,
  }));
}

// Publisher functions
export async function getAllPublishers() {
  return await db
    .select({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
    })
    .from(publishers)
    .orderBy(publishers.name);
}

export async function findPublisherByName(name: string) {
  const normalizedName = normalizePublisherName(name);
  const result = await db
    .select()
    .from(publishers)
    .where(eq(publishers.name, normalizedName))
    .limit(1);

  return result[0] || null;
}

export async function createPublisher(name: string) {
  const normalizedName = normalizePublisherName(name);
  const slug = createSlug(normalizedName);

  const result = await db
    .insert(publishers)
    .values({
      name: normalizedName,
      slug,
    })
    .returning({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
    });

  return result[0];
}

export async function getPublisherById(id: number) {
  const result = await db
    .select()
    .from(publishers)
    .where(eq(publishers.id, id))
    .limit(1);

  return result[0] || null;
}

// Series functions
export async function findSeriesByName(name: string, publisherId?: number) {
  const normalizedName = name.trim();

  const conditions = [eq(series.name, normalizedName)];

  // If publisherId is provided, also filter by publisher
  if (publisherId) {
    conditions.push(eq(series.publisherId, publisherId));
  }

  const result = await db
    .select()
    .from(series)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .limit(1);

  return result[0] || null;
}

export async function createSeries(name: string, publisherId?: number) {
  const normalizedName = name.trim();
  const slug = createSlug(normalizedName);

  const result = await db
    .insert(series)
    .values({
      name: normalizedName,
      slug,
      publisherId,
    })
    .returning({
      id: series.id,
      name: series.name,
      slug: series.slug,
      publisherId: series.publisherId,
      createdAt: series.createdAt,
    });

  return result[0];
}

export async function getOrCreateSeries(name: string, publisherId?: number) {
  if (!name?.trim()) {
    return null;
  }

  // Try to find existing series
  let existingSeries = await findSeriesByName(name, publisherId);

  // If not found, create new series
  if (!existingSeries) {
    existingSeries = await createSeries(name, publisherId);
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

// Publisher details queries
export async function getPublisherBySlug(slug: string) {
  const result = await db
    .select()
    .from(publishers)
    .where(eq(publishers.slug, slug))
    .limit(1);

  return result[0] || null;
}

export async function getPublisherSeriesWithCounts(publisherId: number) {
  const result = await db
    .select({
      id: series.id,
      name: series.name,
      slug: series.slug,
      comicCount: count(comics.id),
    })
    .from(series)
    .leftJoin(comics, eq(comics.seriesId, series.id))
    .where(eq(series.publisherId, publisherId))
    .groupBy(series.id, series.name, series.slug)
    .orderBy(series.name);

  return result;
}

export async function getPublisherComicCount(publisherId: number) {
  const result = await db
    .select({ count: count() })
    .from(comics)
    .where(eq(comics.publisherId, publisherId));

  return result[0]?.count || 0;
}

// Series details queries

export async function getSeriesComics(
  seriesId: number,
  limit: number = 25,
  offset: number = 0,
) {
  return await db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      number: comics.number,
      volume: comics.volume,
      metadata: comics.metadata,
      createdAt: comics.createdAt,
    })
    .from(comics)
    .where(eq(comics.seriesId, seriesId))
    .orderBy(
      // Sort by number (numeric), then by created date
      sql`CASE WHEN ${comics.number} ~ '^[0-9]+$' THEN CAST(${comics.number} AS INTEGER) ELSE 999999 END`,
      comics.number,
      desc(comics.createdAt),
    )
    .limit(limit)
    .offset(offset);
}

export async function getSeriesComicCount(seriesId: number) {
  const result = await db
    .select({ count: count() })
    .from(comics)
    .where(eq(comics.seriesId, seriesId));

  return result[0]?.count || 0;
}

export async function upsertUserComicProgress(
  userId: number,
  comicId: number,
  currentPage: number,
) {
  return db
    .insert(userComics)
    .values({
      userId,
      comicId,
      currentPage,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userComics.userId, userComics.comicId],
      set: {
        currentPage,
        updatedAt: new Date(),
      },
    });
}
