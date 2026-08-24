import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import env from './env.js';
import logger from '../utils/logger.js';

// Supabase URL (local development or cloud)
const SUPABASE_URL = process.env.SUPABASE_URL ||
  (env.DB_HOST !== 'localhost' && env.DB_HOST.startsWith('aws-') ? env.DB_HOST : 'http://localhost:54321');
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.DB_PASSWORD || '';

// Create Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Raw PostgreSQL client for transactions and complex queries
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export { pool };

// Export a helper to get the Supabase client
export const getSupabaseClient = () => supabaseClient;
// Also export as 'supabase' for backwards compatibility
export { supabaseClient as supabase };

// Helper functions
export const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params || []);
    const duration = Date.now() - start;
    if (duration > 1000) logger.warn(`Slow query (${duration}ms): ${text}`);
    return { data: result.rows, error: null, rowCount: result.rowCount };
  } catch (error) {
    logger.error('Database query error', { error: error.message, query: text });
    throw error;
  }
};

export const queryOne = async (text, params) => {
  const { data } = await query(text, params);
  return data && data.length > 0 ? data[0] : null;
};

export const queryAll = async (text, params) => {
  const { data } = await query(text, params);
  return data || [];
};

export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const close = async () => {
  await pool.end();
};

export default supabaseClient;
