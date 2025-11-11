import chalk from 'chalk';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { v4 as uuid } from 'uuid';
import { client } from '../db/index.js';
import {
  deleteComicsOlderThan,
  findComicByFileName,
  findComicsToDelete,
  insertComic,
  updateComicLastSynced,
  updateComicMetadata,
} from '../db/queries.js';
import { extractCover } from '../lib/covers.js';
import { extractComicMetadata } from '../lib/metadata.js';

async function processComicFiles(
  directory: string,
  syncTime: Date,
): Promise<number> {
  let processedCount = 0;

  try {
    const items = await readdir(directory);

    for (const item of items) {
      const fullPath = join(directory, item);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subCount = await processComicFiles(fullPath, syncTime);
        processedCount += subCount;
      } else if (stats.isFile()) {
        // Check if file has CBZ or CBR extension
        const lowerCase = item.toLowerCase();
        if (lowerCase.endsWith('.cbz') || lowerCase.endsWith('.cbr')) {
          processedCount++;

          // Check if file exists in database
          const existingFile = await findComicByFileName(fullPath);

          if (existingFile.length === 0) {
            const id = uuid();
            // Scenario 1: New file - extract metadata and insert
            const comicInfo = await extractComicMetadata(fullPath);

            await insertComic({
              id,
              fileName: fullPath,
              fileModified: stats.mtime,
              lastSynced: syncTime,
              ...comicInfo,
            });

            // Extract cover image
            const coversDirectory = process.env.COVERS_DIRECTORY;
            if (coversDirectory) {
              await extractCover(id, fullPath, coversDirectory);
            }
          } else {
            const existing = existingFile[0];
            const existingModified = new Date(existing.fileModified);

            if (existingModified.getTime() === stats.mtime.getTime()) {
              // Scenario 2: Unchanged file - just update lastSynced
              await updateComicLastSynced(fullPath, syncTime);
            } else {
              // Scenario 3: Modified file - re-extract metadata and update
              const comicInfo = await extractComicMetadata(fullPath);

              await updateComicMetadata(fullPath, {
                fileModified: stats.mtime,
                lastSynced: syncTime,
                ...comicInfo,
              });

              // Re-extract cover image since file changed
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
  // Default scan directory - can be overridden later with CLI args
  const scanDirectory = process.env.SCAN_DIRECTORY || './comics';
  const absolutePath = resolve(scanDirectory);

  console.log(chalk.blue.bold('\n📚 Comic Scanner v1.0.0'));
  console.log(chalk.gray('─'.repeat(50)));

  console.log(
    `\n🔍 ${chalk.cyan('Scanning directory:')} ${chalk.yellow(absolutePath)}`,
  );
  console.log(
    `📊 ${chalk.cyan('Looking for:')} ${chalk.white('CBZ, CBR')} files`,
  );

  // Scan for comic files
  console.log(`\n⏳ ${chalk.cyan('Processing comic files...')}\n`);
  process.stdout.write(`${chalk.gray('Progress:')} `);

  // Create a single timestamp for this scan operation
  const syncTime = new Date();
  const totalFiles = await processComicFiles(absolutePath, syncTime);

  console.log(); // New line after dots

  // Clean up missing files from database
  console.log(`\n🧹 ${chalk.cyan('Cleaning up missing files...')}`);

  // First, count how many records will be deleted
  const toDeleteCount = await findComicsToDelete(syncTime);
  const deletedCount = toDeleteCount.length;

  // Then delete them
  if (deletedCount > 0) {
    await deleteComicsOlderThan(syncTime);
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
  } else {
    console.log(`✅ ${chalk.gray('No missing comics to remove.')}`);
  }

  console.log(`\n🎉 ${chalk.cyan('Scan complete!')}\n`);

  // Close database connection
  await client.end();
}

// Run main function directly since this is the entry point
main().catch(async (error) => {
  console.error(chalk.red('💥 Fatal error:', error));
  await client.end();
  process.exit(1);
});
