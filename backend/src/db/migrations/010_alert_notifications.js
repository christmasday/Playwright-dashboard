/**
 * Migration 010: Slack, Microsoft Teams & Discord Alert Destinations and Delivery Logs
 */

import { pool } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const up = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create alert_destinations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_destinations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        webhook_url TEXT NOT NULL,
        events VARCHAR(50) DEFAULT 'failures_only',
        branches VARCHAR(255) DEFAULT '*',
        include_ai_summary BOOLEAN DEFAULT TRUE,
        enabled BOOLEAN DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_destinations_project_id ON alert_destinations(project_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_destinations_enabled ON alert_destinations(enabled);
    `);

    // 2. Create alert_delivery_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_delivery_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_destination_id UUID REFERENCES alert_destinations(id) ON DELETE CASCADE,
        build_id UUID REFERENCES builds(id) ON DELETE SET NULL,
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        status_code INTEGER,
        latency_ms INTEGER DEFAULT 0,
        error_message TEXT,
        payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_dest_id ON alert_delivery_logs(alert_destination_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_build_id ON alert_delivery_logs(build_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_created_at ON alert_delivery_logs(created_at DESC);
    `);

    await client.query("INSERT INTO migrations (name) VALUES ('010_alert_notifications') ON CONFLICT (name) DO NOTHING");
    await client.query('COMMIT');
    logger.info('Migration 010_alert_notifications applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default { up };
