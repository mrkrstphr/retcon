import { getComicById, updateComicPageCount } from '@retcon/common/db/queries';
import { combinePagesInArchive } from '@retcon/common/lib';
import { rm } from 'fs/promises';
import { join, normalize, resolve } from 'path';
import { data } from 'react-router';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/CombinePages';

export async function action({ params, request }: Route.ActionArgs) {
  await protectRoute(request);

  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { sqid, page } = params;
  if (!sqid || !page) {
    return data({ error: 'Missing parameters' }, { status: 400 });
  }

  const comicId = sqidToIdOr404(sqid, 'Comic');
  const pageNumber = parseInt(page, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return data({ error: 'Invalid page number' }, { status: 400 });
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
    const { newPageCount } = await combinePagesInArchive(
      comic.fileName,
      comicId,
      pageNumber,
      dataDirectory,
    );

    await updateComicPageCount(comicId, newPageCount);

    // Best-effort: clear thumbnail disk cache so page numbers regenerate correctly
    rm(join(dataDirectory, 'thumbnails', String(comicId)), { recursive: true, force: true }).catch(
      () => undefined,
    );

    return data({ success: true, newPageCount }, { status: 200 });
  } catch (error) {
    console.error(`Error combining page ${pageNumber} of comic ${comicId}:`, error);
    return data(
      {
        error: 'Failed to combine pages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
