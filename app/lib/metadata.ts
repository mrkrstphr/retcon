import { XMLParser } from 'fast-xml-parser';
import StreamZip, { type StreamZipAsync } from 'node-stream-zip';

export function parseComicInfo(metadata: any) {
  if (!metadata) return {};

  return {
    series: metadata.Series || null,
    number: metadata.Number || null,
    volume: metadata.Volume || null,
    publisher: metadata.Publisher || null,
    metadata: metadata,
  };
}

export function parseComicBookInfo(comicBookInfo: any) {
  if (!comicBookInfo) return {};

  return {
    series: comicBookInfo.series || null,
    number: comicBookInfo.issue ? String(comicBookInfo.issue) : null,
    volume: comicBookInfo.volume ? String(comicBookInfo.volume) : null,
    publisher: comicBookInfo.publisher || null,
    metadata: comicBookInfo,
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
    } catch (jsonError) {}
  }
}

async function processZipFile(filePath: string) {
  const zip = new StreamZip.async({ file: filePath });
  const comicInfoMetadata = await getZipComicInfoFile(zip);

  if (comicInfoMetadata) {
    await zip.close();
    return comicInfoMetadata;
  }

  const zipCommentMetadata = await getZipComicCommentInfo(zip);

  if (zipCommentMetadata) {
    await zip.close();
    return zipCommentMetadata;
  }

  await zip.close();
}

export async function extractComicMetadata(filePath: string): Promise<any> {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith('.cbz')) {
    return processZipFile(filePath);
  } else if (lowerPath.endsWith('.cbr')) {
    // For now, skip CBR files (RAR format is more complex)
    console.log(`   ⚠️  CBR files not supported yet: ${filePath}`);
  }
}
