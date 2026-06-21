import { getComicByIdForUser } from '@retcon/common/db/queries';
import { extractPageFromArchive, getSortedImagesFromZip, makeThumbnail } from '@retcon/common/lib';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/ComicPageThumbnail';

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { sqid, page } = params;

  if (!sqid || !page) {
    throw new Response('Missing sqid or page parameter', { status: 404 });
  }

  const user = await protectRoute(request);

  const comicId = sqidToIdOr404(sqid, 'Comic');

  const pageNumber = parseInt(page, 10);
  if (isNaN(pageNumber) || pageNumber < 1) {
    throw new Response('Invalid page number', { status: 400 });
  }

  const comic = await getComicByIdForUser(comicId, user.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  if (comic.pageCount < pageNumber) {
    throw new Response('Page not found', { status: 404 });
  }

  const dataDirectory = process.env.DATA_DIRECTORY;
  if (!dataDirectory) {
    throw new Response('DATA_DIRECTORY not configured', { status: 500 });
  }

  const thumbnailDir = join(dataDirectory, 'thumbnails', String(comicId));
  const thumbnailPath = join(thumbnailDir, `${pageNumber}.jpg`);

  // Serve from disk cache if available
  try {
    const cached = await readFile(thumbnailPath);
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Cache miss — extract, resize, write, then serve
  }

  try {
    const imageFiles = await getSortedImagesFromZip(comic.fileName);

    if (imageFiles.length === 0) {
      throw new Response('No pages found in comic', { status: 404 });
    }

    if (pageNumber > imageFiles.length) {
      throw new Response('Page not found', { status: 404 });
    }

    const pageFileName = imageFiles[pageNumber - 1];
    const { data } = await extractPageFromArchive(comic.fileName, pageFileName);

    const thumbnail = await makeThumbnail(data);

    // Write to disk cache (best-effort — don't fail the request if write fails)
    try {
      await mkdir(thumbnailDir, { recursive: true });
      await writeFile(thumbnailPath, thumbnail);
    } catch (cacheErr) {
      console.error(`Failed to cache thumbnail for comic ${comicId} page ${pageNumber}:`, cacheErr);
    }

    return new Response(new Uint8Array(thumbnail), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error(`Error serving thumbnail for page ${pageNumber} of comic ${comicId}:`, error);
    throw new Response('Error reading comic page', { status: 500 });
  }
};
