import StreamZip from 'node-stream-zip';
import { basename, extname } from 'path';
import { getComicById } from '~/db/queries';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/ComicPage';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];

/**
 * Get all image files from a CBZ archive, sorted alphabetically
 */
async function getImageFilesFromArchive(filePath: string): Promise<string[]> {
  const lowerPath = filePath.toLowerCase();

  if (!lowerPath.endsWith('.cbz')) {
    throw new Error('Only CBZ files are supported');
  }

  try {
    const zip = new StreamZip.async({ file: filePath });
    const entries = await zip.entries();

    // Get all image files, filter out dot files, and sort alphabetically
    const imageFiles = Object.values(entries)
      .filter((entry) => {
        // Skip directories
        if (entry.isDirectory) return false;

        // Skip dot files
        const fileName = basename(entry.name);
        if (fileName.startsWith('.')) return false;

        // Check if it's an image file
        const ext = extname(entry.name).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    await zip.close();
    return imageFiles;
  } catch (error) {
    console.error(`Error reading archive ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extract a specific page (image file) from a CBZ archive
 */
async function extractPageFromArchive(
  filePath: string,
  fileName: string,
): Promise<{ data: Buffer; mimeType: string }> {
  try {
    const zip = new StreamZip.async({ file: filePath });
    const imageData = await zip.entryData(fileName);
    await zip.close();

    // Determine MIME type based on file extension
    const ext = extname(fileName).toLowerCase();
    let mimeType = 'image/jpeg'; // default

    switch (ext) {
      case '.png':
        mimeType = 'image/png';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.bmp':
        mimeType = 'image/bmp';
        break;
      default:
        mimeType = 'image/jpeg';
    }

    return { data: imageData, mimeType };
  } catch (error) {
    console.error(`Error extracting page ${fileName} from ${filePath}:`, error);
    throw error;
  }
}

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { sqid, page } = params;

  if (!sqid || !page) {
    throw new Response('Missing sqid or page parameter', { status: 404 });
  }

  const comicId = sqidToId(sqid);
  const pageNumber = parseInt(page, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    throw new Response('Invalid page number', { status: 400 });
  }

  // Find the comic by comicId
  const comic = await getComicById(comicId);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  try {
    // Get all image files from the comic archive
    const imageFiles = await getImageFilesFromArchive(comic.fileName);

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
