import { exec } from 'child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { rmSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { getSortedImagesFromZip } from './getSortedImagesFromZip.js';

const execAsync = promisify(exec);

type TrashEntry =
  | { type: 'delete'; pageNumber: number; fileName: string; entryName?: string; deletedAt: string }
  | {
      type: 'combine';
      pageNumber: number;
      fileName: string;
      entryName?: string;
      pairedPageNumber: number;
      pairedFileName: string;
      pairedEntryName?: string;
      combinedAt: string;
    };

interface TrashIndex {
  comicId: number;
  changes: TrashEntry[];
}

async function addFileToArchive(
  filePath: string,
  entryName: string,
  fileData: Buffer,
): Promise<void> {
  const tempId = randomUUID();
  const tempBase = `/tmp/restore-temp/${tempId}`;
  mkdirSync(join(tempBase, dirname(entryName)), { recursive: true });
  writeFileSync(join(tempBase, entryName), fileData);
  try {
    const escapedFilePath = filePath.replace(/"/g, '\\"');
    const escapedEntry = entryName.replace(/"/g, '\\"');
    await execAsync(`cd "${tempBase}" && zip "${escapedFilePath}" "${escapedEntry}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });
  } finally {
    rmSync(tempBase, { recursive: true, force: true });
  }
}

export async function restoreTrashEntry(
  filePath: string,
  comicId: number,
  entryIndex: number,
  dataDirectory: string,
): Promise<{ newPageCount: number }> {
  const trashDir = join(dataDirectory, 'trash', String(comicId));
  const indexPath = join(trashDir, 'index.json');

  if (!existsSync(indexPath)) {
    throw new Error('No trash index found for this comic');
  }

  const trashIndex = JSON.parse(readFileSync(indexPath, 'utf-8')) as TrashIndex;

  if (entryIndex < 0 || entryIndex >= trashIndex.changes.length) {
    throw new Error(`Trash entry ${entryIndex} not found`);
  }

  const entry = trashIndex.changes[entryIndex];

  if (entry.type === 'delete') {
    const trashFilePath = join(trashDir, entry.fileName);
    if (!existsSync(trashFilePath)) {
      throw new Error(`Trashed file ${entry.fileName} not found`);
    }
    const fileData = readFileSync(trashFilePath);
    const entryName = entry.entryName ?? entry.fileName;
    await addFileToArchive(filePath, entryName, fileData);
    unlinkSync(trashFilePath);
  } else {
    const trashFilePath1 = join(trashDir, entry.fileName);
    const trashFilePath2 = join(trashDir, entry.pairedFileName);
    if (!existsSync(trashFilePath1) || !existsSync(trashFilePath2)) {
      throw new Error(`Trashed files not found for combine entry`);
    }
    const fileData1 = readFileSync(trashFilePath1);
    const fileData2 = readFileSync(trashFilePath2);
    const entryName = entry.entryName ?? entry.fileName;
    const pairedEntryName = entry.pairedEntryName ?? entry.pairedFileName;

    // Remove the combined image (it lives at the original entry1 path)
    const escapedFilePath = filePath.replace(/"/g, '\\"');
    const escapedEntry = entryName.replace(/"/g, '\\"');
    await execAsync(`zip -d "${escapedFilePath}" "${escapedEntry}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });

    // Add both originals back
    await addFileToArchive(filePath, entryName, fileData1);
    await addFileToArchive(filePath, pairedEntryName, fileData2);

    unlinkSync(trashFilePath1);
    unlinkSync(trashFilePath2);
  }

  trashIndex.changes.splice(entryIndex, 1);
  writeFileSync(indexPath, JSON.stringify(trashIndex, null, 2), 'utf-8');

  const imageFiles = await getSortedImagesFromZip(filePath);
  return { newPageCount: imageFiles.length };
}
