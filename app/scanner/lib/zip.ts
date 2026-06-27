import { IMAGE_EXTENSIONS } from '../../constants.js';
import { XMLParser } from 'fast-xml-parser';
import StreamZip, { type StreamZipAsync } from 'node-stream-zip';
import { basename, extname } from 'path';
import { parseComicBookInfo, parseComicInfo } from './metadata.js';

/**
 * Your one-stop-shop for everything we need to know about a CBZ/ZIP archive
 */
export async function fetchArchiveInfo(filePath: string): Promise<{
  metadata: any;
  cover: Buffer<ArrayBufferLike> | undefined;
  pageCount: number;
}> {
  const zip = new StreamZip.async({ file: filePath });
  const comicInfoMetadata = await getZipComicInfoFile(zip);

  let metadata;

  if (comicInfoMetadata) {
    metadata = comicInfoMetadata;
  } else {
    const zipCommentMetadata = await getZipComicCommentInfo(zip);

    if (zipCommentMetadata) {
      metadata = zipCommentMetadata;
    }
  }

  let pageCount = 0;
  let cover = undefined;
  try {
    const images = await getSortedImagesFromZip(zip);
    pageCount = images.length;
    const coverPath = images.length > 0 ? images[0] : undefined;
    if (coverPath) {
      cover = await zip.entryData(coverPath);
    }
  } catch (error) {
    console.warn(`⚠️ Could not get pages ${filePath}:`, error);
  }

  await zip.close();

  return {
    metadata,
    cover,
    pageCount,
  };
}

async function getZipComicInfoFile(zip: StreamZipAsync) {
  const entries = await zip.entries();

  const comicInfoEntry = Object.values(entries).find(
    (entry) => entry.name.toLowerCase() === 'comicinfo.xml',
  );

  if (comicInfoEntry) {
    const xmlData = await zip.entryData(comicInfoEntry);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const result = parser.parse(xmlData.toString());

    // Extract and clean the ComicInfo object
    if (result.ComicInfo) {
      const comicInfo = { ...result.ComicInfo };
      // Remove Pages array if it exists (we're not interested in page-level data)
      delete comicInfo.Pages;
      return parseComicInfo(comicInfo);
    }
  }
}

async function getZipComicCommentInfo(zip: StreamZipAsync) {
  let zipComment: string | undefined;
  try {
    zipComment = await zip.comment;
  } catch (e) {}

  if (zipComment && zipComment.trim().length > 0) {
    try {
      const commentData = JSON.parse(zipComment);

      if (commentData && commentData['ComicBookInfo/1.0']) {
        return parseComicBookInfo(commentData['ComicBookInfo/1.0']);
      }
    } catch (jsonError) {
      console.info(`ZIP comment is not valid JSON:`, jsonError);
    }
  }
}

export async function getSortedImagesFromZip(zip: StreamZipAsync): Promise<string[]> {
  try {
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

    return imageFiles;
  } catch (error) {
    console.error(`Error reading archive:`, error);
    throw error;
  }
}
