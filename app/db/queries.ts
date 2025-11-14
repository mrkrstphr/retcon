import { and, count, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { createSlug, normalizePublisherName } from '../lib/slugs.js';
import { db } from './index.js';
import { countOrZero } from './lib/countOrZero.js';
import { firstOrNull } from './lib/firstOrNull.js';
import { comics, publishers, series, userComics } from './schema.js';

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
    .leftJoin(
      userComics,
      and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)),
    )
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
        metadata: comics.metadata,
        currentPage: userComics.currentPage,
        isRead: userComics.isRead,
        createdAt: comics.createdAt,
      })
      .from(comics)
      .leftJoin(publishers, eq(comics.publisherId, publishers.id))
      .leftJoin(series, eq(comics.seriesId, series.id))
      .leftJoin(
        userComics,
        and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)),
      )
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
  metadata?: any;
}) {
  return db.insert(comics).values(data).returning({ insertedId: comics.id });
}

export function updateComicLastSynced(fileName: string, lastSynced: Date) {
  return db
    .update(comics)
    .set({ lastSynced })
    .where(eq(comics.fileName, fileName));
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
    metadata?: any;
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
        ilike(comics.fileName, searchPattern),
        ilike(publishers.name, searchPattern),
      ),
    )
    .orderBy(desc(comics.lastSynced))
    .limit(limit)
    .offset(offset);
}

export function getSearchCount(searchTerm: string) {
  if (!searchTerm.trim()) {
    return 0;
  }

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return countOrZero(
    db
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
      ),
  );
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

  return firstOrNull(
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

export function createSeries(name: string, publisherId?: number) {
  const normalizedName = name.trim();
  const slug = createSlug(normalizedName);

  return firstOrNull(
    db
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
      }),
  );
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

export function getPublisherComicCount(publisherId: number) {
  return countOrZero(
    db
      .select({ count: count() })
      .from(comics)
      .where(eq(comics.publisherId, publisherId)),
  );
}

export function getSeriesComicCount(seriesId: number) {
  return countOrZero(
    db
      .select({ count: count() })
      .from(comics)
      .where(eq(comics.seriesId, seriesId)),
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
      createdAt: comics.createdAt,
    })
    .from(comics)
    .leftJoin(
      userComics,
      and(eq(userComics.comicId, comics.id), eq(userComics.userId, userId)),
    )
    .leftJoin(series, eq(comics.seriesId, series.id))
    .where(eq(comics.seriesId, seriesId))
    .orderBy(
      sql`(${comics.metadata}->>'releaseDate')::date ASC`,
      comics.number,
      desc(comics.createdAt),
    )
    .limit(limit)
    .offset(offset);
}

// TODO: this AI generated function needs further review
export async function getSeriesReadStatus(seriesId: number, userId: number) {
  // Get total comic count for the series
  const totalComicsResult = await db
    .select({ count: count() })
    .from(comics)
    .where(eq(comics.seriesId, seriesId));

  const totalComics = totalComicsResult[0]?.count || 0;

  if (totalComics === 0) {
    return { totalComics: 0, readComics: 0, allRead: false, noneRead: true };
  }

  // Get count of read comics for this user
  const readComicsResult = await db
    .select({ count: count() })
    .from(comics)
    .innerJoin(
      userComics,
      and(
        eq(userComics.comicId, comics.id),
        eq(userComics.userId, userId),
        eq(userComics.isRead, true),
      ),
    )
    .where(eq(comics.seriesId, seriesId));

  const readComics = readComicsResult[0]?.count || 0;

  return {
    totalComics,
    readComics,
    allRead: readComics === totalComics,
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

// TODO: this AI generated function needs further review
export async function markSeriesAsRead(userId: number, seriesId: number) {
  // Get all comics in the series
  const seriesComics = await db
    .select({ id: comics.id })
    .from(comics)
    .where(eq(comics.seriesId, seriesId));

  if (seriesComics.length === 0) {
    return;
  }

  // Mark all comics in the series as read
  const values = seriesComics.map((comic) => ({
    userId,
    comicId: comic.id,
    currentPage: 1,
    isRead: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return db
    .insert(userComics)
    .values(values)
    .onConflictDoUpdate({
      target: [userComics.userId, userComics.comicId],
      set: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
}

export function deleteUserComicRecord(userId: number, comicId: number) {
  return db
    .delete(userComics)
    .where(and(eq(userComics.userId, userId), eq(userComics.comicId, comicId)));
}

// TODO: this AI generated function needs further review
export async function deleteUserSeriesRecords(
  userId: number,
  seriesId: number,
) {
  // First get all comic IDs in the series
  const seriesComics = await db
    .select({ id: comics.id })
    .from(comics)
    .where(eq(comics.seriesId, seriesId));

  if (seriesComics.length === 0) {
    return;
  }

  const comicIds = seriesComics.map((comic) => comic.id);

  // Delete user_comics records for all comics in the series
  return db
    .delete(userComics)
    .where(
      and(eq(userComics.userId, userId), inArray(userComics.comicId, comicIds)),
    );
}
