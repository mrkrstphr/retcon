import { exec } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { promisify } from 'util';
import { extractPageFromArchive } from './extractPageFromArchive.js';
import { getSortedImagesFromZip } from './getSortedImagesFromZip.js';

const execAsync = promisify(exec);

interface TrashEntry {
  type: 'delete';
  pageNumber: number;
  fileName: string;
  deletedAt: string;
}

interface TrashIndex {
  comicId: number;
  changes: TrashEntry[];
}

export async function deletePageFromArchive(
  filePath: string,
  comicId: number,
  pageNumber: number,
  dataDirectory: string,
): Promise<{ newPageCount: number }> {
  const imageFiles = await getSortedImagesFromZip(filePath);

  if (pageNumber < 1 || pageNumber > imageFiles.length) {
    throw new Error(`Page ${pageNumber} out of range (1–${imageFiles.length})`);
  }

  const entryName = imageFiles[pageNumber - 1];
  const fileName = basename(entryName);

  const { data } = await extractPageFromArchive(filePath, entryName);

  const trashDir = join(dataDirectory, 'trash', String(comicId));
  mkdirSync(trashDir, { recursive: true });

  writeFileSync(join(trashDir, fileName), data);

  const indexPath = join(trashDir, 'index.json');
  let trashIndex: TrashIndex = { comicId, changes: [] };
  if (existsSync(indexPath)) {
    trashIndex = JSON.parse(readFileSync(indexPath, 'utf-8')) as TrashIndex;
  }
  trashIndex.changes.push({
    type: 'delete',
    pageNumber,
    fileName,
    deletedAt: new Date().toISOString(),
  });
  writeFileSync(indexPath, JSON.stringify(trashIndex, null, 2), 'utf-8');

  // zip -d removes the entry; escape internal quotes in the entry name
  const escapedEntry = entryName.replace(/"/g, '\\"');
  await execAsync(`zip -d "${filePath}" "${escapedEntry}"`, {
    maxBuffer: 1024 * 1024 * 10,
  });

  return { newPageCount: imageFiles.length - 1 };
}
