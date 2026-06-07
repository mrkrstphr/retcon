import {
  deleteComic,
  deleteEmptyPublishers,
  deleteEmptySeries,
  findComicByFileName,
} from '../db/queries.js';
import chokidar from 'chokidar';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { deleteCover } from '../scanner/lib/covers.js';
import { createComic } from '../scanner/lib/createComic.js';
import { updateComic } from '../scanner/lib/updateComic.js';

const watchDir = process.env.SCAN_DIRECTORY || 'comics';
const COVERS_DIRECTORY = `${process.env.DATA_DIRECTORY ?? 'data'}/covers`;
const debounceDelay = 1000 * 5;
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

if (!existsSync(watchDir)) {
  console.error(`Watch directory does not exist: ${watchDir}`);
  process.exit(1);
}

const queue: string[] = [];
let isProcessingQueue = false;

const watcher = chokidar.watch(watchDir, {
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 10000,
});

console.log(`👀 Watching ${watchDir} for changes...`);

async function processQueue() {
  if (isProcessingQueue || queue.length === 0) return;
  isProcessingQueue = true;
  try {
    const path = queue.shift()!;
    console.log(`📂 Processing file event for: ${path}`);
    const results = await findComicByFileName(path);
    const existingFile = results[0] ?? null;
    const fileStats = await stat(path);
    if (existingFile) {
      console.log(`  🔄 Detected change in existing comic file, ID: ${existingFile.id}`);
      await updateComic(existingFile, path, fileStats, new Date());
    } else {
      console.log(`  ➕ New comic file detected: ${path}`);
      await createComic(path, fileStats, new Date());
    }
  } catch (e) {
    console.error('Error processing queue:', e);
  } finally {
    isProcessingQueue = false;
    if (queue.length > 0) {
      processQueue();
    } else {
      const deletedSeries = await deleteEmptySeries();
      const deletedPublishers = await deleteEmptyPublishers();
      if (deletedSeries.length > 0) console.log(`🗑️  Deleted ${deletedSeries.length} empty series`);
      if (deletedPublishers.length > 0)
        console.log(`🗑️  Deleted ${deletedPublishers.length} empty publishers`);
    }
  }
}

function handleFileEvent(path: string) {
  if (debounceMap.has(path)) {
    clearTimeout(debounceMap.get(path));
  }
  // Debounce: chokidar emits multiple events for a single file change (especially over network)
  debounceMap.set(
    path,
    setTimeout(async () => {
      debounceMap.delete(path);
      queue.push(path);
      processQueue();
    }, debounceDelay),
  );
}

watcher
  .on('add', (path) => handleFileEvent(path))
  .on('change', (path) => handleFileEvent(path))
  .on('unlink', async (path) => {
    const results = await findComicByFileName(path);
    const existingFile = results[0] ?? null;
    if (existingFile) {
      await deleteCover(existingFile.id, COVERS_DIRECTORY);
      await deleteComic(existingFile.id);
      console.log(
        `❌ Deleted comic record and cover for removed file: ${path} [ID=${existingFile.id}]`,
      );
      const deletedSeries = await deleteEmptySeries();
      const deletedPublishers = await deleteEmptyPublishers();
      if (deletedSeries.length > 0) console.log(`🗑️  Deleted ${deletedSeries.length} empty series`);
      if (deletedPublishers.length > 0)
        console.log(`🗑️  Deleted ${deletedPublishers.length} empty publishers`);
    }
  });
