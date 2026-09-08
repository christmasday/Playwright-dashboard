/**
 * Alert Destination Model
 * Manages Slack, Microsoft Teams, and Discord incoming webhook configurations and delivery logs.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, query, queryOne, queryAll } from '../config/database.js';

export const AlertDestination = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const insertPayload = {
      id,
      project_id: data.projectId || null,
      name: data.name,
      provider: data.provider,
      webhook_url: data.webhookUrl,
      events: data.events || 'failures_only',
      branches: data.branches || '*',
      include_ai_summary: data.includeAiSummary !== undefined ? data.includeAiSummary : true,
      enabled: data.enabled !== undefined ? data.enabled : true,
      created_by: data.createdBy || null,
      created_at: now,
      updated_at: now,
    };

    const result = await supabase
      .from('alert_destinations')
      .insert(insertPayload)
      .select()
      .single();

    if (result.error) {
      // Fallback to raw query if Supabase client errors
      const sql = `
        INSERT INTO alert_destinations (
          id, project_id, name, provider, webhook_url, events, branches, include_ai_summary, enabled, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const values = [
        id,
        insertPayload.project_id,
        insertPayload.name,
        insertPayload.provider,
        insertPayload.webhook_url,
        insertPayload.events,
        insertPayload.branches,
        insertPayload.include_ai_summary,
        insertPayload.enabled,
        insertPayload.created_by,
        insertPayload.created_at,
        insertPayload.updated_at,
      ];
      return await queryOne(sql, values);
    }

    return result.data;
  },

  findById: async (id) => {
    const result = await supabase
      .from('alert_destinations')
      .select('*, projects(name)')
      .eq('id', id)
      .maybeSingle();

    if (result.error || !result.data) {
      const sql = `
        SELECT ad.*, p.name AS project_name
        FROM alert_destinations ad
        LEFT JOIN projects p ON ad.project_id = p.id
        WHERE ad.id = $1
      `;
      return await queryOne(sql, [id]);
    }

    return {
      ...result.data,
      project_name: result.data.projects?.name || null,
    };
  },

  list: async ({ projectId, provider, enabled } = {}) => {
    const conditions = ['1=1'];
    const params = [];

    if (projectId) {
      params.push(projectId);
      // Include both project-specific and global destinations (project_id IS NULL)
      conditions.push(`(ad.project_id = $${params.length} OR ad.project_id IS NULL)`);
    }

    if (provider) {
      params.push(provider);
      conditions.push(`ad.provider = $${params.length}`);
    }

    if (enabled !== undefined) {
      params.push(Boolean(enabled));
      conditions.push(`ad.enabled = $${params.length}`);
    }

    const sql = `
      SELECT ad.*, p.name AS project_name
      FROM alert_destinations ad
      LEFT JOIN projects p ON ad.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ad.created_at DESC
    `;

    const { data } = await query(sql, params);
    return data || [];
  },

  update: async (id, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.provider !== undefined) updates.provider = data.provider;
    if (data.webhookUrl !== undefined) updates.webhook_url = data.webhookUrl;
    if (data.projectId !== undefined) updates.project_id = data.projectId || null;
    if (data.events !== undefined) updates.events = data.events;
    if (data.branches !== undefined) updates.branches = data.branches;
    if (data.includeAiSummary !== undefined) updates.include_ai_summary = data.includeAiSummary;
    if (data.enabled !== undefined) updates.enabled = data.enabled;
    updates.updated_at = new Date();

    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(updates)) {
      sets.push(`${key} = $${i++}`);
      values.push(val);
    }
    values.push(id);

    const sql = `
      UPDATE alert_destinations
      SET ${sets.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    return await queryOne(sql, values);
  },

  delete: async (id) => {
    const result = await supabase
      .from('alert_destinations')
      .delete()
      .eq('id', id)
      .select();

    if (result.error || !result.data) {
      return await queryOne('DELETE FROM alert_destinations WHERE id = $1 RETURNING *', [id]);
    }

    return result.data[0] || null;
  },

  createDeliveryLog: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO alert_delivery_logs (
        id, alert_destination_id, build_id, provider, status, status_code, latency_ms, error_message, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      data.alertDestinationId || null,
      data.buildId || null,
      data.provider,
      data.status,
      data.statusCode || null,
      data.latencyMs || 0,
      data.errorMessage || null,
      data.payload ? JSON.stringify(data.payload) : null,
      now,
    ];

    return await queryOne(sql, values);
  },

  getDeliveryLogs: async ({ destinationId, buildId, limit = 50 } = {}) => {
    const conditions = ['1=1'];
    const params = [];

    if (destinationId) {
      params.push(destinationId);
      conditions.push(`adl.alert_destination_id = $${params.length}`);
    }

    if (buildId) {
      params.push(buildId);
      conditions.push(`adl.build_id = $${params.length}`);
    }

    params.push(limit);

    const sql = `
      SELECT adl.*, ad.name AS destination_name, b.name AS build_name
      FROM alert_delivery_logs adl
      LEFT JOIN alert_destinations ad ON adl.alert_destination_id = ad.id
      LEFT JOIN builds b ON adl.build_id = b.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY adl.created_at DESC
      LIMIT $${params.length}
    `;

    const { data } = await query(sql, params);
    return data || [];
  },
};

export default AlertDestination;
