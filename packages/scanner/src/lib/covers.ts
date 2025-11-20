import {
  extractPageFromArchive,
  getSortedImagesFromZip,
} from '@retcon/common/lib';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

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
    // Get all image files, filter out dot files, and sort alphabetically
    const imageFiles = await getSortedImagesFromZip(filePath);

    if (imageFiles.length === 0) {
      return null;
    }

    // Get the first image
    const firstImage = imageFiles[0];
    const { data: imageData } = await extractPageFromArchive(
      filePath,
      firstImage,
    );

    return {
      name: firstImage,
      data: imageData,
    };
  } catch (error) {
    console.error(`   ❌ Error extracting cover from ${filePath}:`, error);
    return null;
  }
}

/**
 * Resize image to fit within max dimensions while preserving aspect ratio
 * Always converts to JPG format for consistency
 */
async function resizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 }) // Always convert to JPEG
      .toBuffer();
  } catch (error) {
    console.error('   ❌ Error resizing image:', error);
    // If Sharp fails, return original buffer
    return imageBuffer;
  }
}

/**
 * Extract and save cover image from a comic file
 */
export async function extractCover(
  id: number,
  comicFilePath: string,
  coversDirectory: string,
): Promise<string | null> {
  try {
    // Get the first image from the archive
    const imageData = await getFirstImageFromArchive(comicFilePath);
    if (!imageData) {
      return null;
    }

    // Resize the image (always converts to JPG)
    const resizedImageBuffer = await resizeImage(imageData.data);

    // Determine output path - always use .jpg extension
    const subdirectory = id.toString()[0].toLowerCase();
    const outputDir = join(coversDirectory, subdirectory);
    const outputFileName = `${id}.jpg`;
    const outputPath = join(outputDir, outputFileName);

    // Create directory if it doesn't exist
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Save the resized image
    await writeFile(outputPath, resizedImageBuffer);

    return outputPath;
  } catch (error) {
    console.error(`   ❌ Error extracting cover from ${comicFilePath}:`, error);
    return null;
  }
}

/**
 * Delete cover image file for a comic
 */
export async function deleteCover(
  id: number,
  coversDirectory: string,
): Promise<boolean> {
  if (!coversDirectory) {
    return false;
  }

  try {
    const subdirectory = id.toString()[0].toLowerCase();
    const outputDir = join(coversDirectory, subdirectory);
    const coverPath = join(outputDir, `${id}.jpg`);

    if (existsSync(coverPath)) {
      await unlink(coverPath);
      return true;
    }

    return false; // No cover file found
  } catch (error) {
    console.error(`   ❌ Error deleting cover for ${id}:`, error);
    return false;
  }
}
