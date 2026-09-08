/**
 * Migration 012: Storage & Data Retention Policies with Custom Timeframes & BYOS
 */

import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create storage_retention_policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage_retention_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        tier VARCHAR(50) DEFAULT 'custom',
        artifacts_passed_days INTEGER DEFAULT 7,
        artifacts_failed_days INTEGER DEFAULT 21,
        test_results_days INTEGER DEFAULT 90,
        test_details_days INTEGER DEFAULT 30,
        reports_analytics_days INTEGER DEFAULT 365,
        byos_enabled BOOLEAN DEFAULT FALSE,
        byos_provider VARCHAR(50) DEFAULT 's3',
        byos_config JSONB DEFAULT '{}'::jsonb,
        auto_purge_enabled BOOLEAN DEFAULT TRUE,
        last_cleanup_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_policy_project_id_null 
      ON storage_retention_policies ((project_id IS NULL)) 
      WHERE project_id IS NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_retention_policies_project_id 
      ON storage_retention_policies(project_id);
    `);

    // Insert default global policy if not already existing
    await client.query(`
      INSERT INTO storage_retention_policies (
        project_id,
        tier,
        artifacts_passed_days,
        artifacts_failed_days,
        test_results_days,
        test_details_days,
        reports_analytics_days,
        byos_enabled,
        byos_provider,
        byos_config,
        auto_purge_enabled
      )
      SELECT NULL, 'custom', 7, 21, 90, 30, 365, FALSE, 's3', '{}'::jsonb, TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM storage_retention_policies WHERE project_id IS NULL
      );
    `);

    await client.query("INSERT INTO migrations (name) VALUES ('012_storage_retention_policies') ON CONFLICT (name) DO NOTHING");
    await client.query('COMMIT');
    logger.info('Migration 012_storage_retention_policies applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration 012_storage_retention_policies failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

export const down = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS storage_retention_policies CASCADE;');
    await client.query("DELETE FROM migrations WHERE name = '012_storage_retention_policies'");
    await client.query('COMMIT');
    logger.info('Migration 012_storage_retention_policies rolled back');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Rollback of 012_storage_retention_policies failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

export default { up, down };
