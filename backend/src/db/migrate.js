/**
 * Database Migration Runner
 * Run with: npm run migrate
 * Applies all pending migrations from src/db/migrations in order.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getErrorDetails = (error) => {
  if (!error) return { message: 'Unknown error' };
  if (typeof error === 'string') return { message: error };
  return {
    message: error.message || 'Unknown error',
    code: error.code,
    detail: error.detail,
    stack: error.stack,
  };
};

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const res = await client.query('SELECT name FROM migrations');
  return new Set(res.rows.map((r) => r.name));
};

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.js'))
      .sort();

    for (const file of files) {
      const migrationName = path.basename(file, '.js');
      if (applied.has(migrationName)) {
        logger.info(`Skipping already-applied migration: ${migrationName}`);
        continue;
      }
      const migration = (await import(path.join(migrationsDir, file))).default;
      logger.info(`Applying migration: ${migrationName}`);
      await migration.up();
    }

    logger.info('All migrations completed');
  } catch (error) {
    logger.error('Migration error', getErrorDetails(error));
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

export const migrate = async () => {
  try {
    logger.info('Starting migrations...');
    await runMigrations();
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration process failed', getErrorDetails(error));
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export default migrate;
