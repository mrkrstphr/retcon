import { APP_NAME } from '@retcon/common/constants';
import { client } from '@retcon/common/db';
import {
  createPublisher,
  createSeries,
  deleteEmptyPublishers,
  deleteEmptySeries,
  findComicByFileName,
  findPublisherByName,
  getAllPublishers,
  getAllSeries,
  getComicCount,
  insertComic,
  updateComicLastSynced,
  updateComicMetadata,
} from '@retcon/common/db/queries';
import { createComicSlug } from '@retcon/common/lib';
import chalk from 'chalk';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { deleteMissingIssues } from './lib/cleanup.js';
import { saveCover } from './lib/covers.js';
import { fetchArchiveInfo } from './lib/zip.js';

const { cyan, gray, white } = chalk;

const metrics: Record<string, number> = {};

type PublisherMap = Map<string, number>;
type SeriesMap = Map<
  number,
  Map<string, Map<string, { id: number; name: string }>>
>;

const publisherMap: PublisherMap = new Map();
const seriesMap: SeriesMap = new Map();

function formatReleaseDate(dateString?: string) {
  if (!dateString) return null;
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  if (dateString.match(/^\d{4}-\d{2}$/)) return `${dateString}-01`;

  return null;
}

/**
 * Get or create a publisher and return its ID
 */
async function getOrCreatePublisher(publisherName: string): Promise<number> {
  const trimmedName = publisherName.trim();

  // Check if we already have this publisher in our map
  if (publisherMap.has(trimmedName)) {
    return publisherMap.get(trimmedName)!;
  }

  // Try to find existing publisher in database
  let existingPublisher = await findPublisherByName(trimmedName);

  let publisherId: number;

  // If not found, create new publisher
  if (!existingPublisher) {
    const newPublisher = await createPublisher(trimmedName);
    publisherId = newPublisher.id;
  } else {
    publisherId = existingPublisher.id;
  }

  // Add to map for future lookups
  publisherMap.set(trimmedName, publisherId);

  return publisherId;
}

async function getOrCreateSeriesX(
  publisherId: number,
  seriesName: string,
  volume: string | null,
): Promise<{ id: number; name: string }> {
  const searchName = seriesName.trim().toLowerCase();
  const searchVolume = volume?.trim().toLowerCase() || '__NA__';

  const series = seriesMap.get(publisherId)?.get(searchName)?.get(searchVolume);

  if (series) {
    return series;
  }

  const newSeries = await createSeries(
    seriesName.trim(),
    volume?.trim(),
    publisherId,
  );

  if (!seriesMap.has(publisherId)) {
    seriesMap.set(publisherId, new Map());
  }

  if (!seriesMap.get(publisherId)!.has(searchName)) {
    seriesMap.get(publisherId)!.set(searchName, new Map());
  }

  seriesMap
    .get(publisherId)!
    .get(searchName)!
    .set(searchVolume, { id: newSeries.id, name: newSeries.name });

  return { id: newSeries.id, name: newSeries.name };
}

async function createComic(path: string, stats: any, lastSynced: Date) {
  const { metadata, cover, pageCount } = await fetchArchiveInfo(path);

  let publisherId, series;

  if (metadata?.publisher) {
    publisherId = await getOrCreatePublisher(metadata.publisher);

    if (metadata?.series) {
      series = await getOrCreateSeriesX(
        publisherId,
        metadata.series,
        metadata.volume,
      );
    }
  }

  const slug = createComicSlug(series?.name ?? null, metadata?.number, path);

  const [{ insertedId: id }] = await insertComic({
    fileName: path,
    fileModified: stats.mtime,
    lastSynced,
    ...(metadata ?? {}),
    slug,
    pageCount,
    publisherId,
    seriesId: series?.id,
    releaseDate: formatReleaseDate(metadata?.metadata?.releaseDate),
  });

  const coversDirectory = `${process.env.DATA_DIRECTORY}/covers`;
  if (cover && coversDirectory) {
    await saveCover(id, cover, coversDirectory);
  }
}

async function updateComic(
  comic: { id: number },
  path: string,
  stats: any,
  lastSynced: Date,
) {
  const { metadata, cover, pageCount } = await fetchArchiveInfo(path);

  let publisherId, series;

  if (metadata?.publisher) {
    publisherId = await getOrCreatePublisher(metadata.publisher);

    if (metadata?.series) {
      series = await getOrCreateSeriesX(
        publisherId,
        metadata.series,
        metadata.volume,
      );
    }
  }

  const slug = createComicSlug(series?.name || null, metadata?.number, path);

  await updateComicMetadata(path, {
    fileModified: stats.mtime,
    lastSynced,
    ...metadata,
    slug,
    pageCount,
    publisherId,
    seriesId: series?.id,
    releaseDate: formatReleaseDate(metadata?.releaseDate),
  });

  const coversDirectory = `${process.env.DATA_DIRECTORY}/covers`;
  if (cover && coversDirectory) {
    await saveCover(comic.id, cover, coversDirectory);
  }
}

async function processComicFiles(
  directory: string,
  syncTime: Date,
  forceUpdate: boolean = false,
): Promise<number> {
  let processedCount = 0;
  try {
    const items = await readdir(directory);

    for (const item of items) {
      const fullPath = join(directory, item);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subCount = await processComicFiles(
          fullPath,
          syncTime,
          forceUpdate,
        );
        processedCount += subCount;
      } else if (stats.isFile()) {
        const lowerCase = item.toLowerCase();
        if (lowerCase.endsWith('.cbz') || lowerCase.endsWith('.zip')) {
          processedCount++;

          // Check if file exists in database
          // TODO: FIXME: batch this lookup for better performance
          const existingFile = await findComicByFileName(fullPath);

          if (existingFile.length === 0) {
            await createComic(fullPath, stats, syncTime);
          } else {
            const existing = existingFile[0];
            const existingModified = new Date(existing.fileModified);

            if (
              forceUpdate ||
              existingModified.getTime() !== stats.mtime.getTime()
            ) {
              await updateComic(existingFile[0], fullPath, stats, syncTime);
            } else {
              await updateComicLastSynced(fullPath, syncTime);
            }
          }

          // Print a dot for progress
          process.stdout.write('.');
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${directory}:`, error);
  }

  return processedCount;
}

async function main() {
  const startTime = new Date();

  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.blue.bold(`\n📚 ${APP_NAME} - Scanner`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('\nUsage: npm run scan [options]');
    console.log('\nOptions:');
    console.log(
      '  --force-update     Re-process all files regardless of modification time',
    );
    console.log(
      '  --no-cleanup       Skip deletion of missing files from database',
    );
    console.log('  --check-empty      Only run scan if database has no comics');
    console.log('  --dir, --directory Override scan directory path');
    console.log('  --help, -h         Show this help message');
    console.log('\nExamples:');
    console.log('  npm run scan');
    console.log('  npm run scan -- --dir "/path/to/comics"');
    console.log('  npm run scan -- --force-update --no-cleanup');
    console.log('  npm run scan -- --check-empty');
    console.log('  npm run scan -- --dir "/new/location" --no-cleanup\n');
    return;
  }

  const forceUpdate = args.includes('--force-update');
  const noCleanup = args.includes('--no-cleanup');
  const checkEmpty = args.includes('--check-empty');

  // If check-empty flag is set, exit early if database already has comics
  if (checkEmpty) {
    const comicCount = await getComicCount();
    if (comicCount > 0) {
      console.log(
        chalk.gray(
          `📚 Database already contains ${comicCount} comic(s). Skipping initial scan.`,
        ),
      );
      await client.end();
      return;
    }
    console.log(
      chalk.cyan('📭 Database is empty. Proceeding with initial scan...'),
    );
  }

  // Check for directory override
  let scanDirectory = process.env.SCAN_DIRECTORY || './comics';
  const dirIndex = args.findIndex(
    (arg) => arg === '--dir' || arg === '--directory',
  );
  if (dirIndex !== -1 && args[dirIndex + 1]) {
    scanDirectory = args[dirIndex + 1];
  }

  const absolutePath = resolve(scanDirectory);

  // Validate directory exists
  try {
    const stats = await stat(absolutePath);
    if (!stats.isDirectory()) {
      console.error(
        chalk.red(`❌ Error: "${absolutePath}" is not a directory`),
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `❌ Error: Directory "${absolutePath}" does not exist or is not accessible`,
      ),
    );
    process.exit(1);
  }

  console.log(chalk.blue.bold(`\n📚 ${APP_NAME}`));
  console.log(chalk.gray('─'.repeat(50)));

  if (forceUpdate) {
    console.log(
      `🔄 ${chalk.yellow('FORCE UPDATE MODE:')} ${chalk.white('Re-processing all files regardless of modification time')}`,
    );
  }

  if (noCleanup) {
    console.log(
      `🚫 ${chalk.yellow('NO CLEANUP MODE:')} ${chalk.white('Skipping deletion of missing files from database')}`,
    );
  }

  console.log(
    `\n🔍 ${chalk.cyan('Scanning directory:')} ${chalk.yellow(absolutePath)}`,
  );
  console.log(
    `📊 ${chalk.cyan('Looking for:')} ${chalk.white('CBZ, ZIP')} files`,
  );

  // Scan for comic files
  console.log(`\n⏳ ${chalk.cyan('Processing comic files...')}\n`);
  process.stdout.write(`${chalk.gray('Progress:')} `);

  // Initialize publisher map for efficient lookups
  console.log(`\n📚 ${chalk.cyan('Loading existing publishers...')}`);
  const allPublishers = await getAllPublishers();
  const allSeries = await getAllSeries();

  // Pre-populate the map with existing publishers
  allPublishers.forEach((publisher) => {
    publisherMap.set(publisher.name.trim().toLowerCase(), publisher.id);
  });

  allSeries.forEach((series) => {
    const publisherId = series.publisherId ?? 0;
    const seriesName = series.name.trim().toLowerCase();
    const volume = series.volume?.trim().toLowerCase() ?? '__NA__';
    if (!seriesMap.has(publisherId)) {
      seriesMap.set(publisherId, new Map());
    }

    if (!seriesMap.get(publisherId)!.has(seriesName)) {
      seriesMap.get(publisherId)!.set(seriesName, new Map());
    }

    seriesMap
      .get(publisherId)!
      .get(seriesName)!
      .set(volume, { id: series.id, name: series.name });
  });

  console.log(
    `   ${chalk.gray('Loaded')} ${chalk.white.bold(
      allPublishers.length,
    )} ${chalk.gray('existing publisher(s)')}`,
  );

  process.stdout.write(`${chalk.gray('Progress:')} `);

  // Create a single timestamp for this scan operation
  const syncTime = new Date();
  const totalFiles = await processComicFiles(
    absolutePath,
    syncTime,
    forceUpdate,
  );

  console.log();

  if (!noCleanup) {
    console.log(`\n${cyan('🧹 Performing cleanup...')}`);

    const deleteComicsCount = await deleteMissingIssues(syncTime);
    console.log(
      cyan(
        `  ◌ Removed ${white(deleteComicsCount)} missing comic(s) from database!`,
      ),
    );

    const deletedSeries = await deleteEmptySeries();
    console.log(
      cyan(`  ◌ Removed ${white(deletedSeries.length)} empty series.`),
    );

    const deletedPublishers = await deleteEmptyPublishers();
    console.log(
      cyan(`  ◌ Removed ${white(deletedPublishers.length)} empty publishers.`),
    );
  } else {
    console.log(
      `\n🚫 ${chalk.yellow('Skipping cleanup of missing files (--no-cleanup flag active)')}`,
    );
  }

  if (totalFiles === 0) {
    console.log(gray('📂 No comic files found in the specified directory.'));
  } else {
    console.log(
      `\n✨ ${cyan('Processed')} ${white(
        totalFiles,
      )} ${cyan('comic file(s)!')}`,
    );
  }

  console.log(`\n${cyan('🎉 Scan complete!')}`);

  // Calculate and display execution time
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSec = durationMs / 1000;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSecRemainder = (durationMs % 60000) / 1000;

  if (durationMs < 60000) {
    // Less than 1 minute - show in seconds
    console.log(
      `⏱️ ${chalk.cyan('Execution time:')} ${chalk.white.bold(
        durationSec.toFixed(2),
      )} ${chalk.cyan('seconds')}`,
    );
  } else {
    // 1 minute or more - show in minutes and seconds
    console.log(
      `⏱️ ${chalk.cyan('Execution time:')} ${chalk.white.bold(
        durationMin,
      )} ${chalk.cyan(`minute${durationMin > 1 ? 's' : ''}`)} ${chalk.white.bold(
        durationSecRemainder.toFixed(2),
      )} ${chalk.cyan(`second${durationSecRemainder > 1 ? 's' : ''}`)}`,
    );
  }

  console.log();

  await client.end();
}

main().catch(async (error) => {
  console.error(chalk.red('💥 Fatal error:', error));
  await client.end();
  process.exit(1);
});
