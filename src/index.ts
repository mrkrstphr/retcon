import chalk from "chalk";
import { readdir, stat } from "fs/promises";
import { join, resolve } from "path";

async function findAndPrintComicFiles(directory: string): Promise<number> {
  let fileCount = 0;

  try {
    const items = await readdir(directory);

    for (const item of items) {
      const fullPath = join(directory, item);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subCount = await findAndPrintComicFiles(fullPath);
        fileCount += subCount;
      } else if (stats.isFile()) {
        // Check if file has CBZ or CBR extension
        const lowerCase = item.toLowerCase();
        if (lowerCase.endsWith(".cbz") || lowerCase.endsWith(".cbr")) {
          fileCount++;
          const extension = lowerCase.endsWith(".cbz")
            ? chalk.blue("CBZ")
            : chalk.magenta("CBR");
          console.log(
            `${chalk.gray(
              `${fileCount}.`.padStart(3)
            )} ${extension} ${chalk.white(item)}`
          );
          console.log(`    ${chalk.gray(fullPath)}`);
        }
      }
    }
  } catch (error) {
    console.error(
      chalk.red(`❌ Error scanning directory ${directory}:`),
      error
    );
  }

  return fileCount;
}
async function main() {
  // Default scan directory - can be overridden later with CLI args
  const scanDirectory = process.env.SCAN_DIRECTORY || "./comics";
  const absolutePath = resolve(scanDirectory);

  console.log(chalk.blue.bold("\n📚 Comic Scanner v1.0.0"));
  console.log(chalk.gray("─".repeat(50)));

  console.log(
    `\n${chalk.green("🔍")} ${chalk.cyan("Scanning directory:")} ${chalk.yellow(
      absolutePath
    )}`
  );
  console.log(
    `${chalk.magenta("📊")} ${chalk.cyan("Looking for:")} ${chalk.white(
      "CBZ"
    )} ${chalk.gray("•")} ${chalk.white("CBR")} files`
  );

  // Scan for comic files
  console.log(
    `\n${chalk.blue("⏳")} ${chalk.cyan("Searching for comic files...")}`
  );
  console.log(chalk.gray("─".repeat(50)));

  const totalFiles = await findAndPrintComicFiles(absolutePath);

  console.log(chalk.gray("─".repeat(50)));
  if (totalFiles === 0) {
    console.log(
      `${chalk.yellow("📂")} ${chalk.gray(
        "No comic files found in the specified directory."
      )}`
    );
  } else {
    console.log(
      `\n${chalk.green("✨")} ${chalk.cyan("Found")} ${chalk.white.bold(
        totalFiles
      )} ${chalk.cyan("comic file(s) total!")}`
    );
  }

  console.log(`\n${chalk.green("🎉")} ${chalk.cyan("Scan complete!")}\n`);
}

// Run main function directly since this is the entry point
main().catch((error) => {
  console.error(chalk.red("💥 Fatal error:"), error);
  process.exit(1);
});
