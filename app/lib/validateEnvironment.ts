import { existsSync } from 'node:fs';

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DATA_DIRECTORY',
  'SCAN_DIRECTORY',
  'COOKIE_SECRET',
] as const;
const DIRECTORY_VARS = ['DATA_DIRECTORY', 'SCAN_DIRECTORY'] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nSet these in your .env file before starting the server.`,
    );
  }

  const missingDirs: string[] = [];
  for (const key of DIRECTORY_VARS) {
    const dir = process.env[key]!;
    if (!existsSync(dir)) {
      missingDirs.push(`  - ${key}=${dir}`);
    }
  }

  if (missingDirs.length > 0) {
    throw new Error(
      `The following configured directories do not exist:\n${missingDirs.join('\n')}\n\nCreate these directories or update your .env file.`,
    );
  }
}
