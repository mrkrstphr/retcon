import { count, desc, eq, lt } from 'drizzle-orm';
import { db } from './index.js';
import { comics } from './schema.js';

export async function getComicCount() {
  const result = await db.select({ count: count() }).from(comics);

  return result[0]?.count || 0;
}

export async function getRecentComics(limit: number = 10) {
  return await db
    .select({
      id: comics.id,
      fileName: comics.fileName,
      series: comics.series,
      number: comics.number,
      volume: comics.volume,
      publisher: comics.publisher,
      lastSynced: comics.lastSynced,
    })
    .from(comics)
    .orderBy(desc(comics.lastSynced))
    .limit(limit);
}

export async function findComicByFileName(fileName: string) {
  return await db
    .select()
    .from(comics)
    .where(eq(comics.fileName, fileName))
    .limit(1);
}

export async function insertComic(data: {
  fileName: string;
  fileModified: Date;
  lastSynced: Date;
  series?: string | null;
  number?: string | null;
  volume?: string | null;
  publisher?: string | null;
  metadata?: any;
}) {
  return await db.insert(comics).values(data);
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
    series?: string | null;
    number?: string | null;
    volume?: string | null;
    publisher?: string | null;
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
