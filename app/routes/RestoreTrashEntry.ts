import { getComicById, updateComicPageCount } from '@retcon/common/db/queries';
import { restoreTrashEntry } from '@retcon/common/lib';
import { rm } from 'fs/promises';
import { join, normalize, resolve } from 'path';
import { data } from 'react-router';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/RestoreTrashEntry';

export async function action({ params, request }: Route.ActionArgs) {
  await protectRoute(request);

  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { sqid, index } = params;
  if (!sqid || index === undefined) {
    return data({ error: 'Missing parameters' }, { status: 400 });
  }

  const comicId = sqidToIdOr404(sqid, 'Comic');
  const entryIndex = parseInt(index, 10);

  if (isNaN(entryIndex) || entryIndex < 0) {
    return data({ error: 'Invalid entry index' }, { status: 400 });
  }

  const dataDirectory = process.env.DATA_DIRECTORY;
  if (!dataDirectory) {
    return data({ error: 'DATA_DIRECTORY not configured' }, { status: 500 });
  }

  const scanDirectory = process.env.SCAN_DIRECTORY;
  if (!scanDirectory) {
    return data({ error: 'SCAN_DIRECTORY not configured' }, { status: 500 });
  }

  const comic = await getComicById(comicId);
  if (!comic) {
    return data({ error: 'Comic not found' }, { status: 404 });
  }

  const normalizedScanDir = normalize(resolve(scanDirectory));
  const normalizedFilePath = normalize(resolve(comic.fileName));
  if (!normalizedFilePath.startsWith(normalizedScanDir + '/')) {
    console.error('File path is outside scan directory', { normalizedFilePath, normalizedScanDir });
    return data({ error: 'File path is outside scan directory' }, { status: 403 });
  }

  try {
    const { newPageCount } = await restoreTrashEntry(
      comic.fileName,
      comicId,
      entryIndex,
      dataDirectory,
    );

    await updateComicPageCount(comicId, newPageCount);

    rm(join(dataDirectory, 'thumbnails', String(comicId)), { recursive: true, force: true }).catch(
      () => undefined,
    );

    return data({ success: true, newPageCount }, { status: 200 });
  } catch (error) {
    console.error(`Error restoring trash entry ${entryIndex} for comic ${comicId}:`, error);
    return data(
      {
        error: 'Failed to restore entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
