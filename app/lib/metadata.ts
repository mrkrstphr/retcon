import { XMLParser } from 'fast-xml-parser';
import StreamZip from 'node-stream-zip';

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

export async function extractComicMetadata(filePath: string): Promise<any> {
  const lowerPath = filePath.toLowerCase();

  try {
    if (lowerPath.endsWith('.cbz')) {
      // Handle CBZ (ZIP) files
      const zip = new StreamZip.async({ file: filePath });
      const entries = await zip.entries();

      // Look for ComicInfo.xml
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
        await zip.close();

        // Extract and clean the ComicInfo object
        if (result.ComicInfo) {
          const comicInfo = { ...result.ComicInfo };
          // Remove Pages array if it exists (we're not interested in page-level data)
          delete comicInfo.Pages;
          return comicInfo;
        }

        return result;
      }

      await zip.close();
      return null;
    } else if (lowerPath.endsWith('.cbr')) {
      // For now, skip CBR files (RAR format is more complex)
      console.log(`   ⚠️  CBR files not supported yet: ${filePath}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error reading metadata from ${filePath}:`, error);
    return null;
  }

  return null;
}
