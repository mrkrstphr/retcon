import StreamZip from 'node-stream-zip';
import { basename, extname } from 'path';
import { IMAGE_EXTENSIONS } from '../constants.js';

/**
 * Get all image files from a CBZ archive, sorted alphabetically
 */
export async function getSortedImagesFromZip(
  filePath: string,
): Promise<string[]> {
  const lowerPath = filePath.toLowerCase();

  if (!lowerPath.endsWith('.cbz') && !lowerPath.endsWith('.zip')) {
    throw new Error('Only CBZ/ZIP files are supported');
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
