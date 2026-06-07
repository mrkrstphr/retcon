import { exec } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Write or update ComicInfo.xml in a CBZ file using native zip command
 *
 * Much faster than adm-zip as it uses native C implementation and doesn't
 * load entire file into memory.
 *
 * @param filePath Path to the CBZ file
 * @param xmlContent ComicInfo.xml content
 * @throws Error if file cannot be modified or zip command fails
 */
export async function writeComicInfoToZip(
  filePath: string,
  xmlContent: string,
): Promise<void> {
  // Create temp directory if it doesn't exist
  const tempDir = '/tmp/comicinfo-temp';
  try {
    mkdirSync(tempDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  // Use correct filename from the start to avoid rename step
  const tempFile = join(tempDir, 'ComicInfo.xml');

  try {
    // Write XML to temp file with correct name
    writeFileSync(tempFile, xmlContent, 'utf-8');

    // Delete old ComicInfo.xml (case variations)
    // Using 2>/dev/null to suppress error output if file doesn't exist
    await execAsync(
      `zip -d "${filePath}" ComicInfo.xml comicinfo.xml COMICINFO.XML 2>/dev/null || true`,
      {
        maxBuffer: 1024 * 1024 * 10,
      },
    );

    // Add new ComicInfo.xml to ZIP root
    // The -j flag junks (removes) directory paths, adding file to root
    const { stderr } = await execAsync(`zip -j "${filePath}" "${tempFile}"`, {
      maxBuffer: 1024 * 1024 * 10,
    });

    // Check for errors in stderr
    if (stderr && !stderr.includes('adding:')) {
      throw new Error(`zip command error: ${stderr}`);
    }

    // Cleanup temp file
    if (existsSync(tempFile)) {
      unlinkSync(tempFile);
    }
  } catch (error) {
    // Cleanup on error
    if (existsSync(tempFile)) {
      try {
        unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    throw new Error(
      `Failed to write ComicInfo.xml: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
