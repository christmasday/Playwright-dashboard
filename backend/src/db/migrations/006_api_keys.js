/**
 * Production Database Schema — Migration 006: API Keys & build.project_id
 * Run via `npm run migrate`
 */
import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure builds.project_id exists (idempotent)
    const buildsCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'builds'
    `);
    const buildColumns = new Set(buildsCols.rows.map((r) => r.column_name));
    if (!buildColumns.has('project_id')) {
      await client.query('ALTER TABLE builds ADD COLUMN project_id UUID REFERENCES projects(id)');
      logger.info('Added project_id column to builds');
    }

    // Extend api_keys with ownership, scoping and lifecycle columns
    const akCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'api_keys'
    `);
    const apiKeyColumns = new Set(akCols.rows.map((r) => r.column_name));

    const addColumn = async (column, definition) => {
      if (!apiKeyColumns.has(column)) {
        await client.query(`ALTER TABLE api_keys ADD COLUMN ${column} ${definition}`);
        logger.info(`Added ${column} column to api_keys`);
      }
    };

    await addColumn('user_id', 'UUID REFERENCES users(id) ON DELETE CASCADE');
    await addColumn('project_id', 'UUID REFERENCES projects(id) ON DELETE SET NULL');
    await addColumn('revoked', 'BOOLEAN NOT NULL DEFAULT false');
    await addColumn('expires_at', 'TIMESTAMP');
    await addColumn('key_prefix', 'VARCHAR(32)');

    // Backfill revoked default for any pre-existing rows
    await client.query(`UPDATE api_keys SET revoked = false WHERE revoked IS NULL`);

    // Index for fast API-key lookups during auth
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`
    );

    await client.query(
      `INSERT INTO migrations (name) VALUES ('006_api_keys') ON CONFLICT (name) DO NOTHING`
    );
    await client.query('COMMIT');
    console.log('✅ Migration 006_api_keys applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
