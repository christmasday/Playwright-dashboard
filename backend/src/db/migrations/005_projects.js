/**
 * Production Database Schema — Migration 005: Projects
 * Run via `npm run migrate`
 */
import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    // Add project_id to builds table if not exists
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'builds'
    `);
    const existingColumns = new Set(columns.rows.map((r) => r.column_name));

    if (!existingColumns.has('project_id')) {
      await client.query('ALTER TABLE builds ADD COLUMN project_id UUID REFERENCES projects(id)');
      logger.info('Added project_id column to builds');
    }

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_builds_project_id ON builds(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)
    `);

    await client.query(`INSERT INTO migrations (name) VALUES ('005_projects') ON CONFLICT (name) DO NOTHING`);
    await client.query('COMMIT');
    console.log('✅ Migration 005_projects applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
