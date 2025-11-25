import {
  deleteComicsOlderThan,
  findComicsToDelete,
} from '@retcon/common/db/queries';
import { deleteCover } from './covers.js';

export async function deleteMissingIssues(syncTime: Date): Promise<number> {
  const toDeleteRecords = await findComicsToDelete(syncTime);

  if (toDeleteRecords.length > 0) {
    const coversDirectory = process.env.COVERS_DIRECTORY;

    if (coversDirectory) {
      for (const record of toDeleteRecords) {
        await deleteCover(record.id, coversDirectory);
      }
    }

    await deleteComicsOlderThan(syncTime);
  }

  return toDeleteRecords.length;
}
