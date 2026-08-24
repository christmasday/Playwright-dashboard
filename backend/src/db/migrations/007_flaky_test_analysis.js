/**
 * Migration 007: Flaky Test Analysis & Quarantine Support
 */

import { pool } from '../../config/database.js';

export default {
  up: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Add quarantine and categorization columns to flaky_tests
      await client.query(`
        ALTER TABLE flaky_tests
        ADD COLUMN IF NOT EXISTS quarantine_status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50) DEFAULT 'Unknown',
        ADD COLUMN IF NOT EXISTS last_error_message TEXT,
        ADD COLUMN IF NOT EXISTS pass_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS quarantined_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMP WITH TIME ZONE;
      `);

      // 2. Add indexes for high performance querying
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_flaky_tests_status ON flaky_tests(quarantine_status);
        CREATE INDEX IF NOT EXISTS idx_flaky_tests_score ON flaky_tests(flakiness_score DESC);
        CREATE INDEX IF NOT EXISTS idx_flaky_tests_category ON flaky_tests(failure_category);
      `);

      // Record migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        ['007_flaky_test_analysis']
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  down: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        ALTER TABLE flaky_tests
        DROP COLUMN IF EXISTS quarantine_status,
        DROP COLUMN IF EXISTS failure_category,
        DROP COLUMN IF EXISTS last_error_message,
        DROP COLUMN IF EXISTS pass_count,
        DROP COLUMN IF EXISTS retry_count,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS quarantined_by,
        DROP COLUMN IF EXISTS quarantined_at;
      `);
      await client.query('DELETE FROM migrations WHERE name = $1', ['007_flaky_test_analysis']);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
