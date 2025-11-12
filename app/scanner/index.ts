import chalk from 'chalk';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { APP_NAME } from '../constants.js';
import { client } from '../db/index.js';
import {
  createPublisher,
  deleteComicsOlderThan,
  findComicByFileName,
  findComicsToDelete,
  findPublisherByName,
  getAllPublishers,
  getOrCreateSeries,
  insertComic,
  updateComicLastSynced,
  updateComicMetadata,
} from '../db/queries.js';
import { deleteCover, extractCover } from '../lib/covers.js';
import { extractComicMetadata } from '../lib/metadata.js';

// Global publisher map for efficient lookups
type PublisherMap = Map<string, number>; // {[name]: id}

/**
 * Get or create a publisher and return its ID
 */
async function getOrCreatePublisher(
  publisherName: string,
  publisherMap: PublisherMap,
): Promise<number | null> {
  if (!publisherName?.trim()) {
    return null;
  }

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

async function processComicFiles(
  directory: string,
  syncTime: Date,
  publisherMap: PublisherMap,
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
          publisherMap,
          forceUpdate,
        );
        processedCount += subCount;
      } else if (stats.isFile()) {
        // Check if file has CBZ or CBR extension
        const lowerCase = item.toLowerCase();
        if (lowerCase.endsWith('.cbz') || lowerCase.endsWith('.cbr')) {
          processedCount++;

          // Check if file exists in database
          const existingFile = await findComicByFileName(fullPath);

          if (existingFile.length === 0) {
            // Scenario 1: New file - extract metadata and insert
            const comicInfo = await extractComicMetadata(fullPath);

            // Get or create publisher
            const publisherId = await getOrCreatePublisher(
              comicInfo.publisher,
              publisherMap,
            );

            // Get or create series (no caching to avoid memory issues)
            const seriesRecord = await getOrCreateSeries(
              comicInfo.series,
              publisherId || undefined,
            );
            const seriesId = seriesRecord?.id || null;

            const [{ insertedId: id }] = await insertComic({
              fileName: fullPath,
              fileModified: stats.mtime,
              lastSynced: syncTime,
              ...comicInfo,
              publisherId,
              seriesId,
            });

            // Extract cover image
            const coversDirectory = process.env.COVERS_DIRECTORY;
            if (coversDirectory) {
              await extractCover(id, fullPath, coversDirectory);
            }
          } else {
            const existing = existingFile[0];
            const existingModified = new Date(existing.fileModified);

            if (
              !forceUpdate &&
              existingModified.getTime() === stats.mtime.getTime()
            ) {
              // Scenario 2: Unchanged file - just update lastSynced (unless force update)
              await updateComicLastSynced(fullPath, syncTime);
            } else {
              // Scenario 3: Modified file OR force update - re-extract metadata and update
              const comicInfo = await extractComicMetadata(fullPath);

              // Get or create publisher
              const publisherId = await getOrCreatePublisher(
                comicInfo.publisher,
                publisherMap,
              );

              // Get or create series (no caching to avoid memory issues)
              const seriesRecord = await getOrCreateSeries(
                comicInfo.series,
                publisherId || undefined,
              );
              const seriesId = seriesRecord?.id || null;

              await updateComicMetadata(fullPath, {
                fileModified: stats.mtime,
                lastSynced: syncTime,
                ...comicInfo,
                publisherId,
                seriesId,
              });

              // Re-extract cover image since file changed or force update
              const coversDirectory = process.env.COVERS_DIRECTORY;
              if (coversDirectory) {
                await extractCover(
                  existingFile[0].id,
                  fullPath,
                  coversDirectory,
                );
              }
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
  // Start timing the scan
  const startTime = new Date();

  // Parse command line arguments
  const args = process.argv.slice(2);

  // Check for help flag
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
    console.log('  --dir, --directory Override scan directory path');
    console.log('  --help, -h         Show this help message');
    console.log('\nExamples:');
    console.log('  npm run scan');
    console.log('  npm run scan -- --dir "/path/to/comics"');
    console.log('  npm run scan -- --force-update --no-cleanup');
    console.log('  npm run scan -- --dir "/new/location" --no-cleanup\n');
    return;
  }

  const forceUpdate = args.includes('--force-update');
  const noCleanup = args.includes('--no-cleanup');

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
    `📊 ${chalk.cyan('Looking for:')} ${chalk.white('CBZ, CBR')} files`,
  );

  // Scan for comic files
  console.log(`\n⏳ ${chalk.cyan('Processing comic files...')}\n`);
  process.stdout.write(`${chalk.gray('Progress:')} `);

  // Initialize publisher map for efficient lookups
  console.log(`\n📚 ${chalk.cyan('Loading existing publishers...')}`);
  const allPublishers = await getAllPublishers();
  const publisherMap: PublisherMap = new Map();

  // Pre-populate the map with existing publishers
  allPublishers.forEach((publisher) => {
    publisherMap.set(publisher.name, publisher.id);
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
    publisherMap,
    forceUpdate,
  );

  console.log(); // New line after dots

  let deletedCount = 0;

  if (!noCleanup) {
    // Clean up missing files from database
    console.log(`\n🧹 ${chalk.cyan('Cleaning up missing files...')}`);

    // First, get records that will be deleted to clean up their covers
    const toDeleteRecords = await findComicsToDelete(syncTime);
    deletedCount = toDeleteRecords.length;

    // Delete cover files for comics that will be removed
    if (deletedCount > 0) {
      const coversDirectory = process.env.COVERS_DIRECTORY;
      if (coversDirectory) {
        for (const record of toDeleteRecords) {
          await deleteCover(record.id, coversDirectory);
        }
      }

      // Then delete the database records
      await deleteComicsOlderThan(syncTime);
    }
  } else {
    console.log(
      `\n🚫 ${chalk.yellow('Skipping cleanup of missing files (--no-cleanup flag active)')}`,
    );
  }

  if (totalFiles === 0) {
    console.log(
      `📂 ${chalk.gray('No comic files found in the specified directory.')}`,
    );
  } else {
    console.log(
      `\n✨ ${chalk.cyan('Processed')} ${chalk.white.bold(
        totalFiles,
      )} ${chalk.cyan('comic file(s)!')}`,
    );
  }

  if (deletedCount > 0) {
    console.log(
      `🗑️ ${chalk.cyan('Removed')} ${chalk.white.bold(
        deletedCount,
      )} ${chalk.cyan('missing comic(s) from database!')}`,
    );
  } else if (!noCleanup) {
    console.log(`✅ ${chalk.gray('No missing comics to remove.')}`);
  }

  console.log(`\n🎉 ${chalk.cyan('Scan complete!')}`);

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

  console.log(); // Extra newline for spacing

  // Close database connection
  await client.end();
}

// Run main function directly since this is the entry point
main().catch(async (error) => {
  console.error(chalk.red('💥 Fatal error:', error));
  await client.end();
  process.exit(1);
});
