/**
 * Production Database Schema — Migration 004: First/last name + password reset
 * Run via `npm run migrate`
 */
import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    const existingColumns = new Set(columns.rows.map((r) => r.column_name));

    if (!existingColumns.has('first_name')) {
      await client.query('ALTER TABLE users ADD COLUMN first_name VARCHAR(255)');
      logger.info('Added first_name column');
    }
    if (!existingColumns.has('last_name')) {
      await client.query('ALTER TABLE users ADD COLUMN last_name VARCHAR(255)');
      logger.info('Added last_name column');
    }
    if (!existingColumns.has('password_reset_token')) {
      await client.query('ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)');
      logger.info('Added password_reset_token column');
    }
    if (!existingColumns.has('password_reset_sent_at')) {
      await client.query('ALTER TABLE users ADD COLUMN password_reset_sent_at TIMESTAMP');
      logger.info('Added password_reset_sent_at column');
    }

    await client.query(`INSERT INTO migrations (name) VALUES ('004_names_password_reset') ON CONFLICT (name) DO NOTHING`);
    await client.query('COMMIT');
    console.log('✅ Migration 004_names_password_reset applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
