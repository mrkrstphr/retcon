import { runScan } from '../scanner/index.js';
import { client } from '../db/index.js';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function main() {
  // Run initial scan on startup (skip if database already has comics)
  await runScan({ checkEmpty: true });

  // Schedule full sweep every 24 hours
  setInterval(async () => {
    console.log('[scheduler] Running scheduled full scan...');
    try {
      await runScan({});
    } catch (error) {
      console.error('[scheduler] Error during scheduled scan:', error);
    }
  }, INTERVAL_MS);

  console.log('[scheduler] Scheduled full scan every 24 hours.');
}

main().catch(async (error) => {
  console.error('[scheduler] Fatal error:', error);
  await client.end();
  process.exit(1);
});
