import { updateComicMetadata } from '../../db/queries.js';
import { createComicSlug } from '../../lib/index.js';
import type { Stats } from 'node:fs';
import { saveCover } from './covers.js';
import { formatReleaseDate } from './formatReleaseDate.js';
import { getOrCreatePublisher } from './getOrCreatePublisher.js';
import { getOrCreateSeries, type SeriesMap } from './getOrCreateSeries.js';
import { fetchArchiveInfo } from './zip.js';

export async function updateComic(
  comic: { id: number },
  path: string,
  stats: Stats,
  lastSynced: Date,
  publisherMap?: Map<string, number>,
  seriesMap?: SeriesMap,
) {
  const { metadata, cover, pageCount } = await fetchArchiveInfo(path);
  let publisherId: number | undefined, series: { id: number; name: string } | undefined;

  if (metadata?.publisher) {
    publisherId = await getOrCreatePublisher(metadata.publisher, publisherMap);
    if (metadata?.series) {
      series = await getOrCreateSeries(publisherId, metadata.series, metadata.volume, seriesMap);
    }
  }

  const slug = createComicSlug(series?.name || null, metadata?.number, path);
  await updateComicMetadata(path, {
    fileModified: stats.mtime,
    lastSynced,
    ...metadata,
    slug,
    pageCount,
    publisherId,
    seriesId: series?.id,
    releaseDate: formatReleaseDate(metadata?.metadata?.releaseDate),
  });

  const coversDirectory = `${process.env.DATA_DIRECTORY}/covers`;
  if (cover && coversDirectory) {
    await saveCover(comic.id, cover, coversDirectory);
  }
}
