import { createPublisher, findPublisherByName } from '../../db/queries.js';

export async function getOrCreatePublisher(
  publisherName: string,
  publisherMap?: Map<string, number>,
): Promise<number> {
  const trimmedName = publisherName.trim();
  const cacheKey = trimmedName.toLowerCase();

  if (publisherMap?.has(cacheKey)) {
    return publisherMap.get(cacheKey)!;
  }

  const existingPublisher = await findPublisherByName(trimmedName);
  if (existingPublisher) {
    publisherMap?.set(cacheKey, existingPublisher.id);
    return existingPublisher.id;
  }

  const newPublisher = await createPublisher(trimmedName);
  publisherMap?.set(cacheKey, newPublisher.id);
  return newPublisher.id;
}
