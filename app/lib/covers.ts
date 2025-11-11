import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import StreamZip from 'node-stream-zip';
import { basename, extname, join } from 'path';

// Try to import sharp, but make it optional
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available - cover images will not be resized');
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_WIDTH = 300;
const MAX_HEIGHT = 500;

/**
 * Get the first alphabetically sorted image file from a CBZ archive
 */
async function getFirstImageFromArchive(
  filePath: string,
): Promise<{ name: string; data: Buffer } | null> {
  const lowerPath = filePath.toLowerCase();

  if (!lowerPath.endsWith('.cbz')) {
    // For now, only handle CBZ files
    return null;
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
      .sort((a, b) => a.name.localeCompare(b.name));

    if (imageFiles.length === 0) {
      await zip.close();
      return null;
    }

    // Get the first image
    const firstImage = imageFiles[0];
    const imageData = await zip.entryData(firstImage);

    await zip.close();

    return {
      name: firstImage.name,
      data: imageData,
    };
  } catch (error) {
    console.error(`   ❌ Error extracting cover from ${filePath}:`, error);
    return null;
  }
}

/**
 * Resize image to fit within max dimensions while preserving aspect ratio
 */
async function resizeImage(
  imageBuffer: Buffer,
  originalFileName: string,
): Promise<{ buffer: Buffer; extension: string }> {
  if (!sharp) {
    // If Sharp is not available, return original image
    const originalExt = extname(originalFileName).toLowerCase();
    return {
      buffer: imageBuffer,
      extension: originalExt || '.jpg',
    };
  }

  try {
    const resizedBuffer = await sharp(imageBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 }) // Convert to JPEG for consistent format
      .toBuffer();

    return {
      buffer: resizedBuffer,
      extension: '.jpg',
    };
  } catch (error) {
    console.error('   ❌ Error resizing image:', error);
    // If Sharp fails, return original buffer
    const originalExt = extname(originalFileName).toLowerCase();
    return {
      buffer: imageBuffer,
      extension: originalExt || '.jpg',
    };
  }
}

/**
 * Extract and save cover image from a comic file
 */
export async function extractCover(
  id: string,
  comicFilePath: string,
  coversDirectory: string,
): Promise<string | null> {
  try {
    // Get the first image from the archive
    const imageData = await getFirstImageFromArchive(comicFilePath);
    if (!imageData) {
      return null;
    }

    // Resize the image
    const resizedImage = await resizeImage(imageData.data, imageData.name);

    // Determine output path
    const subdirectory = id[0].toLowerCase();
    const outputDir = join(coversDirectory, subdirectory);
    const outputFileName = `${id}${resizedImage.extension}`;
    const outputPath = join(outputDir, outputFileName);

    // Create directory if it doesn't exist
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Save the resized image
    await writeFile(outputPath, resizedImage.buffer);

    return outputPath;
  } catch (error) {
    console.error(`   ❌ Error extracting cover from ${comicFilePath}:`, error);
    return null;
  }
}
