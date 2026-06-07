import { createSeries, findSeriesByNameAndVolume } from '../../db/queries.js';

type SeriesMap = Map<number, Map<string, Map<string, { id: number; name: string }>>>;

export async function getOrCreateSeries(
  publisherId: number,
  seriesName: string,
  volume: string | null | undefined,
  seriesMap?: SeriesMap,
): Promise<{ id: number; name: string }> {
  const searchName = seriesName.trim().toLowerCase();
  const searchVolume = volume?.trim().toLowerCase() || '__NA__';

  const series = seriesMap?.get(publisherId)?.get(searchName)?.get(searchVolume);
  if (series) return series;

  if (!seriesMap) {
    const existingSeries = await findSeriesByNameAndVolume(seriesName, volume?.trim(), publisherId);
    if (existingSeries) return { id: existingSeries.id, name: existingSeries.name };
  }

  const newSeries = await createSeries(seriesName.trim(), volume?.trim(), publisherId);

  if (seriesMap) {
    if (!seriesMap.has(publisherId)) seriesMap.set(publisherId, new Map());
    if (!seriesMap.get(publisherId)!.has(searchName)) seriesMap.get(publisherId)!.set(searchName, new Map());
    seriesMap.get(publisherId)!.get(searchName)!.set(searchVolume, { id: newSeries.id, name: newSeries.name });
  }

  return { id: newSeries.id, name: newSeries.name };
}
