/**
 * User Model — authentication & account management
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query, queryOne, queryAll } from '../config/database.js';
import env from '../config/env.js';

export const User = {
  create: async ({ email, username, firstName, lastName, password, role = 'viewer' }) => {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const now = new Date();
    return await queryOne(
      `INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
       RETURNING id, email, username, first_name, last_name, role, is_active, created_at`,
      [id, email, username, firstName || null, lastName || null, passwordHash, role, now, now]
    );
  },

  findByEmail: async (email) => {
    return await queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  },

  findByUsername: async (username) => {
    return await queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  },

  findById: async (id) => {
    return await queryOne(
      'SELECT id, email, username, first_name, last_name, avatar_url, notification_preferences, role, is_active, last_login_at, created_at FROM users WHERE id = $1',
      [id]
    );
  },

  verifyPassword: async (plainPassword, passwordHash) => {
    return await bcrypt.compare(plainPassword, passwordHash);
  },

  updateLastLogin: async (id) => {
    return await queryOne(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
  },

  setRefreshToken: async (id, refreshToken) => {
    return await queryOne(
      'UPDATE users SET refresh_token = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [refreshToken, id]
    );
  },

  list: async (limit = 50, offset = 0) => {
    return await queryAll(
      `SELECT id, email, username, first_name, last_name, role, is_active, last_login_at, created_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  },

  count: async () => {
    const result = await queryOne('SELECT COUNT(*) as count FROM users');
    return parseInt(result.count, 10);
  },

  deactivate: async (id) => {
    return await queryOne(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
  },

  update: async (id, { role, is_active } = {}) => {
    const sets = [];
    const values = [];
    let i = 1;
    if (role !== undefined) {
      sets.push(`role = $${i++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      sets.push(`is_active = $${i++}`);
      values.push(is_active);
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    return await queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, email, username, role, is_active`,
      values
    );
  },

  delete: async (id) => {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    return await query('DELETE FROM users WHERE id = $1', [id]);
  },

  updateProfile: async (id, { firstName, lastName, avatarUrl, notificationPreferences } = {}) => {
    const sets = [];
    const values = [];
    let i = 1;
    if (firstName !== undefined) {
      sets.push(`first_name = $${i++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      sets.push(`last_name = $${i++}`);
      values.push(lastName);
    }
    if (avatarUrl !== undefined) {
      sets.push(`avatar_url = $${i++}`);
      values.push(avatarUrl);
    }
    if (notificationPreferences !== undefined) {
      sets.push(`notification_preferences = $${i++}`);
      values.push(typeof notificationPreferences === 'object' ? JSON.stringify(notificationPreferences) : notificationPreferences);
    }
    if (sets.length === 0) return await User.findById(id);
    sets.push(`updated_at = NOW()`);
    values.push(id);
    return await queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, email, username, first_name, last_name, avatar_url, notification_preferences, role, is_active`,
      values
    );
  },

  // Email verification helpers
  setVerificationToken: async (id, token) => {
    return await queryOne(
      'UPDATE users SET email_verification_token = $1, email_verification_sent_at = NOW() WHERE id = $2 RETURNING id',
      [token, id]
    );
  },

  markEmailVerified: async (id) => {
    return await queryOne(
      'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = $1 RETURNING id, email, email_verified',
      [id]
    );
  },

  findByVerificationToken: async (token) => {
    return await queryOne(
      'SELECT id, email, username, role, is_active, email_verified FROM users WHERE email_verification_token = $1',
      [token]
    );
  },

  // Password reset helpers
  setPasswordResetToken: async (id, token) => {
    return await queryOne(
      'UPDATE users SET password_reset_token = $1, password_reset_sent_at = NOW() WHERE id = $2 RETURNING id',
      [token, id]
    );
  },

  findByPasswordResetToken: async (token) => {
    return await queryOne(
      'SELECT id, email, username, first_name, last_name FROM users WHERE password_reset_token = $1',
      [token]
    );
  },

  clearPasswordResetToken: async (id) => {
    return await queryOne(
      'UPDATE users SET password_reset_token = NULL, password_reset_sent_at = NULL WHERE id = $1 RETURNING id',
      [id]
    );
  },

  updatePassword: async (id, passwordHash) => {
    return await queryOne(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, username',
      [passwordHash, id]
    );
  },

  // Project helpers
  projects: async (userId, { limit, offset, search } = {}) => {
    let whereConditions = ['pm.user_id = $1'];
    const params = [userId];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereConditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.join(' AND ');

    let sql = `
      SELECT p.*, pm.role as member_role
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
    `;

    if (limit !== undefined && offset !== undefined) {
      const dataParams = [...params, limit, offset];
      sql += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
      return await queryAll(sql, dataParams);
    }

    return await queryAll(sql, params);
  },

  countProjects: async (userId, { search } = {}) => {
    let whereConditions = ['pm.user_id = $1'];
    const params = [userId];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereConditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.join(' AND ');
    const row = await queryOne(
      `SELECT COUNT(*) AS total
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE ${whereClause}`,
      params
    );
    return parseInt(row?.total || 0, 10);
  },
};

// Project model
export const Project = {
  create: async ({ name, description, createdBy, status = 'active' }) => {
    const id = uuidv4();
    const now = new Date();
    return await queryOne(
      `INSERT INTO projects (id, name, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, status, created_by, created_at, updated_at`,
      [id, name, description || null, status, createdBy, now, now]
    );
  },

  findById: async (id) => {
    return await queryOne(
      'SELECT id, name, description, status, created_by, created_at, updated_at FROM projects WHERE id = $1',
      [id]
    );
  },

  findByName: async (name) => {
    return await queryOne(
      'SELECT id, name, description, status, created_by, created_at, updated_at FROM projects WHERE name = $1',
      [name]
    );
  },

  update: async (id, { name, description, status }) => {
    const sets = [];
    const values = [];
    let i = 1;
    if (name !== undefined) {
      sets.push(`name = $${i++}`);
      values.push(name);
    }
    if (description !== undefined) {
      sets.push(`description = $${i++}`);
      values.push(description);
    }
    if (status !== undefined) {
      sets.push(`status = $${i++}`);
      values.push(status);
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = NOW()`);
    values.push(id);
    return await queryOne(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, name, description, status, created_by, created_at, updated_at`,
      values
    );
  },

  delete: async (id) => {
    return await query('DELETE FROM projects WHERE id = $1', [id]);
  },

  getBuilds: async (projectId, limit = 50, offset = 0, { search, status } = {}) => {
    try {
      await query(`
        UPDATE builds b
        SET status = CASE
              WHEN EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id AND tr.status = 'failed') THEN 'failed'
              WHEN EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id AND tr.status = 'passed') THEN 'passed'
              ELSE 'completed'
            END,
            ended_at = COALESCE(ended_at, NOW())
        WHERE b.project_id = $1 AND b.status = 'running'
          AND EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id)
      `, [projectId]);
    } catch (_) {}

    const conditions = ['project_id = $1'];
    const params = [projectId];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR branch ILIKE $${params.length} OR commit_message ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const dataParams = [...params, limit, offset];

    return await queryAll(
      `SELECT * FROM builds WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
  },

  countBuilds: async (projectId, { search, status } = {}) => {
    const conditions = ['project_id = $1'];
    const params = [projectId];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR branch ILIKE $${params.length} OR commit_message ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const row = await queryOne(`SELECT COUNT(*) AS total FROM builds WHERE ${whereClause}`, params);
    return parseInt(row?.total || 0, 10);
  },

  getMembers: async (projectId) => {
    return await queryAll(
      `SELECT u.id, u.id as "userId", pm.user_id, u.email, u.username, u.first_name, u.last_name, pm.role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [projectId]
    );
  },

  addMember: async (projectId, userId, role = 'viewer') => {
    const id = uuidv4();
    return await queryOne(
      `INSERT INTO project_members (id, project_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $4
       RETURNING id, project_id, user_id, role`,
      [id, projectId, userId, role]
    );
  },

  removeMember: async (projectId, userId) => {
    return await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
  },

  updateMemberRole: async (projectId, userId, role) => {
    return await queryOne(
      'UPDATE project_members SET role = $3 WHERE project_id = $1 AND user_id = $2 RETURNING id, project_id, user_id, role',
      [projectId, userId, role]
    );
  },

  getInvitations: async (projectId) => {
    return await queryAll(
      `SELECT pi.id, pi.project_id, pi.email, pi.role, pi.status, pi.created_at, u.username as "invitedBy"
       FROM project_invitations pi
       LEFT JOIN users u ON pi.invited_by = u.id
       WHERE pi.project_id = $1 AND pi.status = 'pending'
       ORDER BY pi.created_at DESC`,
      [projectId]
    );
  },

  createInvitation: async (projectId, email, role = 'viewer', invitedBy = null) => {
    const id = uuidv4();
    const token = uuidv4();
    return await queryOne(
      `INSERT INTO project_invitations (id, project_id, email, role, invited_by, token, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING id, project_id, email, role, status, created_at`,
      [id, projectId, email, role, invitedBy, token]
    );
  },

  deleteInvitation: async (projectId, invitationId) => {
    return await query(
      'DELETE FROM project_invitations WHERE id = $1 AND project_id = $2',
      [invitationId, projectId]
    );
  },

  findPendingInvitationsByEmail: async (email) => {
    return await queryAll(
      "SELECT * FROM project_invitations WHERE email = $1 AND status = 'pending'",
      [email]
    );
  },

  acceptInvitation: async (invitationId, userId) => {
    const inv = await queryOne(
      'SELECT * FROM project_invitations WHERE id = $1',
      [invitationId]
    );
    if (!inv) return null;

    await Project.addMember(inv.project_id, userId, inv.role);
    await query(
      "UPDATE project_invitations SET status = 'accepted', updated_at = NOW() WHERE id = $1",
      [invitationId]
    );
    return true;
  },

  isMember: async (projectId, userId) => {
    return await queryOne(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
  },
};

// Refresh token store (table-based revocation)
export const RefreshToken = {
  create: async ({ userId, tokenHash, expiresAt }) => {
    const id = uuidv4();
    return await queryOne(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING id`,
      [id, userId, tokenHash, expiresAt]
    );
  },

  findValid: async (tokenHash) => {
    return await queryOne(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );
  },

  revoke: async (tokenHash) => {
    return await query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
      [tokenHash]
    );
  },

  revokeAllForUser: async (userId) => {
    return await query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );
  },
};

export default { User, RefreshToken, Project };
