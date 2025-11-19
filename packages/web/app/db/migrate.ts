import chalk from 'chalk';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { client, db } from './index.js';

async function runMigrations() {
  try {
    console.log(chalk.blue('🔄 Running database migrations...'));

    await migrate(db, {
      migrationsFolder: './drizzle',
    });

    console.log(chalk.green('✅ Migrations completed successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Migration failed:'), error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
