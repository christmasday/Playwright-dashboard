/**
 * Migration 011: Jira & GitHub Issue Sync Integrations & Linked Issues
 */

import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create integration_configs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        config JSONB NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_configs_project_id ON integration_configs(project_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_configs_provider ON integration_configs(provider);
    `);

    // 2. Create issue_links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS issue_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        test_run_id UUID REFERENCES test_runs(id) ON DELETE SET NULL,
        test_name VARCHAR(500) NOT NULL,
        test_file VARCHAR(500),
        provider VARCHAR(50) NOT NULL,
        issue_id VARCHAR(100) NOT NULL,
        issue_key VARCHAR(100) NOT NULL,
        issue_url TEXT NOT NULL,
        issue_title TEXT NOT NULL,
        issue_status VARCHAR(50) DEFAULT 'open',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_issue_links_test_run_id ON issue_links(test_run_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_issue_links_test_name ON issue_links(test_name);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_issue_links_project_id ON issue_links(project_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_issue_links_provider ON issue_links(provider);
    `);

    await client.query("INSERT INTO migrations (name) VALUES ('011_issue_sync_integrations') ON CONFLICT (name) DO NOTHING");
    await client.query('COMMIT');
    logger.info('Migration 011_issue_sync_integrations applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
