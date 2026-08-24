/**
 * Migration 008: User Profile Avatar & Notification Preferences
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

    if (!existingColumns.has('avatar_url')) {
      await client.query('ALTER TABLE users ADD COLUMN avatar_url TEXT');
      logger.info('Added avatar_url column to users table');
    }
    if (!existingColumns.has('notification_preferences')) {
      await client.query("ALTER TABLE users ADD COLUMN notification_preferences TEXT DEFAULT '{\"emailAlerts\":true,\"flakyAlerts\":true,\"buildFailures\":true,\"weeklyDigest\":false}'");
      logger.info('Added notification_preferences column to users table');
    }

    await client.query("INSERT INTO migrations (name) VALUES ('008_user_profile_settings') ON CONFLICT (name) DO NOTHING");
    await client.query('COMMIT');
    logger.info('Migration 008_user_profile_settings applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
