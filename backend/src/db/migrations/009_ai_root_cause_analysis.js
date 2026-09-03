/**
 * Migration 009: AI Root Cause Analysis & User AI Settings
 */

import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add ai_settings column to users table if not exists
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    const existingColumns = new Set(columns.rows.map((r) => r.column_name));

    if (!existingColumns.has('ai_settings')) {
      await client.query("ALTER TABLE users ADD COLUMN ai_settings TEXT DEFAULT '{\"preferredProvider\":\"heuristics\",\"model\":\"default\"}'");
      logger.info('Added ai_settings column to users table');
    }

    // 2. Create test_ai_analyses table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_ai_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_run_id UUID NOT NULL,
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        confidence_score INTEGER DEFAULT 85,
        summary TEXT NOT NULL,
        root_cause_details TEXT,
        suggested_fix JSONB NOT NULL,
        prevention_tips TEXT[],
        latency_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_ai_analyses_test_run_id ON test_ai_analyses(test_run_id);
    `);
    logger.info('Ensured test_ai_analyses table and index exist');

    await client.query("INSERT INTO migrations (name) VALUES ('009_ai_root_cause_analysis') ON CONFLICT (name) DO NOTHING");
    await client.query('COMMIT');
    logger.info('Migration 009_ai_root_cause_analysis applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
