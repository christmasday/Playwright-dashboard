/**
 * API Key Model
 * Manages user-generated API keys used by the Playwright Dashboard reporter.
 * Only the SHA-256 hash of a key is stored; the plaintext is returned once on creation.
 */
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query, queryOne } from '../config/database.js';
import logger from '../utils/logger.js';

export const ApiKey = {
  /**
   * Create a new API key for a user. Returns the plaintext key exactly once.
   */
  generate: async ({ userId, name, projectId = null }) => {
    const id = uuidv4();
    const plaintext = `pd_sk_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const keyPrefix = plaintext.slice(0, 12);
    const now = new Date();

    await query(
      `INSERT INTO api_keys (id, user_id, project_id, name, key_hash, key_prefix, revoked, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
      [id, userId, projectId, name, keyHash, keyPrefix, now]
    );

    return {
      id,
      name,
      key: plaintext,
      keyPrefix,
      createdAt: now.toISOString(),
    };
  },

  /**
   * Resolve an API key by its SHA-256 hash. Returns null when missing,
   * revoked, or expired.
   */
  findByHash: async (hash) => {
    return queryOne(
      `SELECT * FROM api_keys
       WHERE key_hash = $1
         AND (revoked IS NULL OR revoked = false)
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [hash]
    );
  },

  listByUser: async (userId) => {
    const { data } = await query(
      `SELECT id, name, key_prefix, created_at, last_used, revoked, expires_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return (data || []).map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      keyPrefix: k.key_prefix,
      created_at: k.created_at,
      createdAt: k.created_at,
      last_used: k.last_used,
      lastUsed: k.last_used,
      revoked: k.revoked,
      expires_at: k.expires_at,
      expiresAt: k.expires_at,
    }));
  },

  revoke: async (id, userId) => {
    const { data } = await query(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return Boolean(data && data.length > 0);
  },

  updateLastUsed: async (id) => {
    try {
      await query(`UPDATE api_keys SET last_used = NOW() WHERE id = $1`, [id]);
    } catch (error) {
      logger.error('Failed to update api_key last_used', { error: error.message, id });
    }
  },
};

export default ApiKey;
