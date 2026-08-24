/**
 * Production Database Schema — Migration 003: Email verification columns
 * Run via `npm run migrate`
 */
import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add email verification columns if they don't exist
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    const existingColumns = new Set(columns.rows.map((r) => r.column_name));

    if (!existingColumns.has('email_verified')) {
      await client.query('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false');
      logger.info('Added email_verified column');
    }
    if (!existingColumns.has('email_verification_token')) {
      await client.query('ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)');
      logger.info('Added email_verification_token column');
    }
    if (!existingColumns.has('email_verification_sent_at')) {
      await client.query('ALTER TABLE users ADD COLUMN email_verification_sent_at TIMESTAMP');
      logger.info('Added email_verification_sent_at column');
    }

    await client.query(`INSERT INTO migrations (name) VALUES ('003_email_verification') ON CONFLICT (name) DO NOTHING`);
    await client.query('COMMIT');
    console.log('✅ Migration 003_email_verification applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
