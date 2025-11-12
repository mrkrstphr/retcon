import StreamZip from 'node-stream-zip';
import { extname } from 'path';

/**
 * Extract a specific page (image file) from a CBZ archive
 */
export async function extractPageFromArchive(
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
