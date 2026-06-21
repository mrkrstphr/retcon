import sharp from 'sharp';

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_QUALITY = 72;

// Resizes to ~200px wide JPEG; returns original buffer unchanged if sharp fails.
export async function makeThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(THUMBNAIL_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
  } catch (error) {
    console.error('   ❌ Error creating thumbnail:', error);
    return imageBuffer;
  }
}
