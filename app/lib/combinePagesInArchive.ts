import { exec } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { extractPageFromArchive } from './extractPageFromArchive.js';
import { getSortedImagesFromZip } from './getSortedImagesFromZip.js';

const execAsync = promisify(exec);

type TrashEntry =
  | { type: 'delete'; pageNumber: number; fileName: string; deletedAt: string }
  | {
      type: 'combine';
      pageNumber: number;
      fileName: string;
      pairedPageNumber: number;
      pairedFileName: string;
      combinedAt: string;
    };

interface TrashIndex {
  comicId: number;
  changes: TrashEntry[];
}

export async function combinePagesInArchive(
  filePath: string,
  comicId: number,
  pageNumber: number,
  dataDirectory: string,
): Promise<{ newPageCount: number }> {
  const imageFiles = await getSortedImagesFromZip(filePath);

  if (pageNumber < 1 || pageNumber >= imageFiles.length) {
    throw new Error(
      `Page ${pageNumber} cannot be combined (must be between 1 and ${imageFiles.length - 1})`,
    );
  }

  const entry1 = imageFiles[pageNumber - 1];
  const entry2 = imageFiles[pageNumber];
  const fileName1 = basename(entry1);
  const fileName2 = basename(entry2);

  const { data: data1 } = await extractPageFromArchive(filePath, entry1);
  const { data: data2 } = await extractPageFromArchive(filePath, entry2);

  // Trash both originals
  const trashDir = join(dataDirectory, 'trash', String(comicId));
  mkdirSync(trashDir, { recursive: true });
  writeFileSync(join(trashDir, fileName1), data1);
  writeFileSync(join(trashDir, fileName2), data2);

  const indexPath = join(trashDir, 'index.json');
  let trashIndex: TrashIndex = { comicId, changes: [] };
  if (existsSync(indexPath)) {
    trashIndex = JSON.parse(readFileSync(indexPath, 'utf-8')) as TrashIndex;
  }
  trashIndex.changes.push({
    type: 'combine',
    pageNumber,
    fileName: fileName1,
    pairedPageNumber: pageNumber + 1,
    pairedFileName: fileName2,
    combinedAt: new Date().toISOString(),
  });
  writeFileSync(indexPath, JSON.stringify(trashIndex, null, 2), 'utf-8');

  // Build combined image side-by-side using sharp
  const meta1 = await sharp(data1).metadata();
  const meta2 = await sharp(data2).metadata();
  const totalWidth = (meta1.width ?? 0) + (meta2.width ?? 0);
  const totalHeight = Math.max(meta1.height ?? 0, meta2.height ?? 0);

  const input1 = await sharp(data1).png().toBuffer();
  const input2 = await sharp(data2).png().toBuffer();

  const combinedBuffer = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      { input: input1, left: 0, top: 0 },
      { input: input2, left: meta1.width ?? 0, top: 0 },
    ])
    .png()
    .toBuffer();

  // Write combined image to archive, preserving original entry path
  const tempId = randomUUID();
  const tempBase = `/tmp/combine-temp/${tempId}`;
  mkdirSync(join(tempBase, dirname(entry1)), { recursive: true });
  writeFileSync(join(tempBase, entry1), combinedBuffer);

  try {
    const escapedFilePath = filePath.replace(/"/g, '\\"');
    const escapedEntry1 = entry1.replace(/"/g, '\\"');
    const escapedEntry2 = entry2.replace(/"/g, '\\"');

    await execAsync(`zip -d "${escapedFilePath}" "${escapedEntry1}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });
    await execAsync(`cd "${tempBase}" && zip "${escapedFilePath}" "${escapedEntry1}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });
    await execAsync(`zip -d "${escapedFilePath}" "${escapedEntry2}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });
  } finally {
    rmSync(tempBase, { recursive: true, force: true });
  }

  return { newPageCount: imageFiles.length - 1 };
}
