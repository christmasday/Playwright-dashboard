import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_USERNAME,
  SEED_ADMIN_PASSWORD,
  E2E_PREFIX,
} from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

export async function verifyEmail(email: string): Promise<void> {
  await pool.query('UPDATE users SET email_verified = true WHERE email = $1', [email]);
}

async function deleteUserCompletely(email: string): Promise<void> {
  const ids = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (ids.rowCount === 0) return;
  const userId = ids.rows[0].id;
  for (const table of ['refresh_tokens', 'project_members']) {
    try {
      await pool.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    } catch {
      /* ignore missing tables */
    }
  }
  try {
    await pool.query('DELETE FROM projects WHERE owner_id = $1', [userId]);
  } catch {
    /* ignore */
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch {
    /* ignore */
  }
}

export async function deleteUserByEmail(email: string): Promise<void> {
  await deleteUserCompletely(email);
}

export async function ensureSeedAdmin(): Promise<void> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    SEED_ADMIN_EMAIL,
  ]);
  if (existing.rowCount && existing.rowCount > 0) return;
  const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (id, email, username, password_hash, role, is_active, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', true, true, NOW(), NOW())`,
    [uuidv4(), SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, hash]
  );
}

export async function teardownAll(prefix: string = E2E_PREFIX): Promise<void> {
  const like = `${prefix}%`;
  for (const table of ['refresh_tokens', 'project_members']) {
    try {
      await pool.query(`DELETE FROM ${table} WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1 OR username LIKE $1)`, [like]);
    } catch {
      /* ignore */
    }
  }
  try {
    await pool.query('DELETE FROM projects WHERE name LIKE $1', [like]);
  } catch {
    /* ignore */
  }
  try {
    await pool.query('DELETE FROM conditional_execution_rules WHERE name LIKE $1', [like]);
  } catch {
    /* ignore */
  }
  try {
    await pool.query('DELETE FROM users WHERE email LIKE $1 OR username LIKE $1', [like]);
  } catch {
    /* ignore */
  }
}

export async function getTestRunIdByBuild(buildId: string): Promise<string | null> {
  try {
    const res = await pool.query('SELECT id FROM test_runs WHERE build_id = $1 LIMIT 1', [buildId]);
    return res.rowCount && res.rowCount > 0 ? res.rows[0].id : null;
  } catch {
    return null;
  }
}

let isPoolEnded = false;
export async function closeDb(): Promise<void> {
  if (!isPoolEnded) {
    isPoolEnded = true;
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
  }
}
