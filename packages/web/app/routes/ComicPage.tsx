import { getComicByIdForUser } from '@retcon/common/db/queries';
import {
  extractPageFromArchive,
  getSortedImagesFromZip,
} from '@retcon/common/lib';
import { extname } from 'path';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/ComicPage';

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { sqid, page } = params;

  if (!sqid || !page) {
    throw new Response('Missing sqid or page parameter', { status: 404 });
  }

  const user = await protectRoute(request);

  const comicId = sqidToId(sqid);
  const pageNumber = parseInt(page, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    throw new Response('Invalid page number', { status: 400 });
  }

  // Find the comic by comicId
  const comic = await getComicByIdForUser(comicId, user.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  if (comic.pageCount < pageNumber) {
    throw new Response('Page not found', { status: 404 });
  }

  try {
    // Get all image files from the comic archive
    const imageFiles = await getSortedImagesFromZip(comic.fileName);

    if (imageFiles.length === 0) {
      throw new Response('No pages found in comic', { status: 404 });
    }

    // Check if the requested page exists (1-based indexing)
    if (pageNumber > imageFiles.length) {
      throw new Response('Page not found', { status: 404 });
    }

    const pageFileName = imageFiles[pageNumber - 1]; // Convert to 0-based index

    // Extract the specific page from the archive
    const { data, mimeType } = await extractPageFromArchive(
      comic.fileName,
      pageFileName,
    );

    // Return the image with proper headers for caching
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="page-${pageNumber}.${extname(pageFileName).slice(1)}"`,
      },
    });
  } catch (error) {
    console.error(
      `Error serving page ${pageNumber} of comic ${comicId}:`,
      error,
    );
    throw new Response('Error reading comic page', { status: 500 });
  }
};
