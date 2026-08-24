/**
 * Production Database Schema — Migration 006: Project Invitations
 * Run via `npm run migrate`
 */
import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create project_invitations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_invitations (
        id UUID PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
    `);

    await client.query(`INSERT INTO migrations (name) VALUES ('006_project_invitations') ON CONFLICT (name) DO NOTHING`);
    await client.query('COMMIT');
    console.log('✅ Migration 006_project_invitations applied');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
