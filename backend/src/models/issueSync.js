/**
 * Issue Sync Models
 * Manages IntegrationConfig (Jira & GitHub credentials) and IssueLink (linked tickets).
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, query, queryOne, queryAll } from '../config/database.js';

export const IntegrationConfig = {
  get: async (projectId, provider) => {
    let sql;
    let params;

    if (projectId) {
      sql = `
        SELECT * FROM integration_configs
        WHERE (project_id = $1 OR project_id IS NULL)
          AND provider = $2
        ORDER BY project_id NULLS LAST
        LIMIT 1
      `;
      params = [projectId, provider];
    } else {
      sql = `
        SELECT * FROM integration_configs
        WHERE project_id IS NULL AND provider = $1
        LIMIT 1
      `;
      params = [provider];
    }

    return await queryOne(sql, params);
  },

  list: async (projectId = null) => {
    const conditions = ['1=1'];
    const params = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`(ic.project_id = $${params.length} OR ic.project_id IS NULL)`);
    }

    const sql = `
      SELECT ic.*, p.name AS project_name
      FROM integration_configs ic
      LEFT JOIN projects p ON ic.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ic.created_at DESC
    `;

    const { data } = await query(sql, params);
    return data || [];
  },

  save: async ({ projectId = null, provider, config, enabled = true, createdBy = null }) => {
    const existing = await queryOne(
      `SELECT id FROM integration_configs WHERE project_id IS NOT DISTINCT FROM $1 AND provider = $2`,
      [projectId, provider]
    );

    const now = new Date();

    if (existing) {
      const sql = `
        UPDATE integration_configs
        SET config = $1, enabled = $2, updated_at = $3
        WHERE id = $4
        RETURNING *
      `;
      return await queryOne(sql, [JSON.stringify(config), enabled, now, existing.id]);
    } else {
      const id = uuidv4();
      const sql = `
        INSERT INTO integration_configs (id, project_id, provider, config, enabled, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      return await queryOne(sql, [id, projectId, provider, JSON.stringify(config), enabled, createdBy, now, now]);
    }
  },

  delete: async (id) => {
    return await queryOne('DELETE FROM integration_configs WHERE id = $1 RETURNING *', [id]);
  },
};

export const IssueLink = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO issue_links (
        id, project_id, test_run_id, test_name, test_file, provider, issue_id, issue_key, issue_url, issue_title, issue_status, created_by, last_synced_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      id,
      data.projectId || null,
      data.testRunId || null,
      data.testName,
      data.testFile || null,
      data.provider,
      data.issueId,
      data.issueKey,
      data.issueUrl,
      data.issueTitle,
      data.issueStatus || 'open',
      data.createdBy || null,
      now,
      now,
      now,
    ];

    return await queryOne(sql, values);
  },

  findById: async (id) => {
    return await queryOne('SELECT * FROM issue_links WHERE id = $1', [id]);
  },

  findByTestRunId: async (testRunId) => {
    const sql = `
      SELECT il.*, p.name AS project_name
      FROM issue_links il
      LEFT JOIN projects p ON il.project_id = p.id
      WHERE il.test_run_id = $1
      ORDER BY il.created_at DESC
    `;
    const { data } = await query(sql, [testRunId]);
    return data || [];
  },

  findByTestName: async (testName, projectId = null) => {
    let sql;
    let params;

    if (projectId) {
      sql = `
        SELECT il.*, p.name AS project_name
        FROM issue_links il
        LEFT JOIN projects p ON il.project_id = p.id
        WHERE il.test_name = $1 AND (il.project_id = $2 OR il.project_id IS NULL)
        ORDER BY il.created_at DESC
      `;
      params = [testName, projectId];
    } else {
      sql = `
        SELECT il.*, p.name AS project_name
        FROM issue_links il
        LEFT JOIN projects p ON il.project_id = p.id
        WHERE il.test_name = $1
        ORDER BY il.created_at DESC
      `;
      params = [testName];
    }

    const { data } = await query(sql, params);
    return data || [];
  },

  updateStatus: async (id, status) => {
    const sql = `
      UPDATE issue_links
      SET issue_status = $1, last_synced_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    return await queryOne(sql, [status, id]);
  },

  delete: async (id) => {
    return await queryOne('DELETE FROM issue_links WHERE id = $1 RETURNING *', [id]);
  },

  list: async ({ projectId, limit = 50 } = {}) => {
    const conditions = ['1=1'];
    const params = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`il.project_id = $${params.length}`);
    }

    params.push(limit);

    const sql = `
      SELECT il.*, p.name AS project_name
      FROM issue_links il
      LEFT JOIN projects p ON il.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY il.created_at DESC
      LIMIT $${params.length}
    `;

    const { data } = await query(sql, params);
    return data || [];
  },
};

export default {
  IntegrationConfig,
  IssueLink,
};
