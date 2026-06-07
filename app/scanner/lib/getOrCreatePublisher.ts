import { createPublisher, findPublisherByName } from '../../db/queries.js';

export async function getOrCreatePublisher(
  publisherName: string,
  publisherMap?: Map<string, number>,
): Promise<number> {
  const trimmedName = publisherName.trim();

  if (publisherMap?.has(trimmedName)) {
    return publisherMap.get(trimmedName)!;
  }

  const existingPublisher = await findPublisherByName(trimmedName);
  if (existingPublisher) {
    publisherMap?.set(trimmedName, existingPublisher.id);
    return existingPublisher.id;
  }

  const newPublisher = await createPublisher(trimmedName);
  publisherMap?.set(trimmedName, newPublisher.id);
  return newPublisher.id;
}
