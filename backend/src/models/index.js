/**
 * Database Models
 * Using Supabase client
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, query, queryOne, queryAll } from '../config/database.js';

// Build Model
export const Build = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('builds').insert({
      id,
      name: data.name,
      branch: data.branch,
      commit_hash: data.commitHash,
      commit_message: data.commitMessage,
      environment: data.environment,
      project_id: data.projectId || null,
      status: 'running',
      started_at: now,
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findById: async (id) => {
    const result = await supabase.from('builds').select('*').eq('id', id).maybeSingle();
    return result.data || null;
  },

  update: async (id, data) => {
    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.branch !== undefined) updates.branch = data.branch;
    if (data.commitHash !== undefined) updates.commit_hash = data.commitHash;
    if (data.commitMessage !== undefined) updates.commit_message = data.commitMessage;
    if (data.environment !== undefined) updates.environment = data.environment;
    if (data.projectId !== undefined) updates.project_id = data.projectId;
    if (data.startedAt !== undefined) updates.started_at = data.startedAt;
    if (data.started_at !== undefined) updates.started_at = data.started_at;
    if (data.endedAt !== undefined) updates.ended_at = data.endedAt;
    if (data.ended_at !== undefined) updates.ended_at = data.ended_at;

    const result = await supabase.from('builds').update(updates).eq('id', id).select().maybeSingle();
    if (result.error) {
      const sets = [];
      const values = [];
      let i = 1;
      for (const [key, val] of Object.entries(updates)) {
        sets.push(`${key} = $${i++}`);
        values.push(val);
      }
      if (sets.length > 0) {
        values.push(id);
        return await queryOne(`UPDATE builds SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
      }
    }
    return result.data;
  },

  list: async (limit = 50, offset = 0, { projectId, search, status } = {}) => {
    try {
      await query(`
        UPDATE builds b
        SET status = CASE
              WHEN EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id AND tr.status = 'failed') THEN 'failed'
              WHEN EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id AND tr.status = 'passed') THEN 'passed'
              ELSE 'completed'
            END,
            ended_at = COALESCE(ended_at, NOW())
        WHERE b.status = 'running'
          AND EXISTS (SELECT 1 FROM test_runs tr WHERE tr.build_id = b.id)
      `);
    } catch (_) {}

    const conditions = ['1=1'];
    const params = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`b.project_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(b.name ILIKE $${params.length} OR b.branch ILIKE $${params.length} OR b.commit_message ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const dataParams = [...params, limit, offset];

    const sql = `
      SELECT b.*, p.name AS project_name
      FROM builds b
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;

    const { data } = await query(sql, dataParams);
    return (data || []).map((b) => ({
      ...b,
      project_name: b.project_name || null,
    }));
  },

  count: async ({ projectId, search, status } = {}) => {
    const conditions = ['1=1'];
    const params = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`project_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR branch ILIKE $${params.length} OR commit_message ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) AS total FROM builds WHERE ${whereClause}`;
    const row = await queryOne(countSql, params);
    return parseInt(row?.total || 0, 10);
  },
};

// TestRun Model
export const TestRun = {
  create: async (data, client = null) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('test_runs').insert({
      id,
      build_id: data.buildId,
      name: data.name,
      title: data.title,
      file: data.file,
      tags: Array.isArray(data.tags) ? JSON.stringify(data.tags) : null,
      status: data.status || 'running',
      duration: data.duration || 0,
      retries: data.retries || 0,
      quarantine_reason: data.quarantineReason || null,
      quarantine_expires_at: data.quarantineExpiresAt || null,
      started_at: data.startedAt || now,
      ended_at: data.endedAt || null,
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findById: async (id) => {
    const result = await supabase.from('test_runs').select('*').eq('id', id).maybeSingle();
    return result.data || null;
  },

  findByBuildId: async (buildId, limit = 1000) => {
    const result = await supabase.from('test_runs').select('*').eq('build_id', buildId).order('created_at', { ascending: false }).limit(limit);
    return result.data || [];
  },

  update: async (id, data) => {
    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.duration !== undefined) updates.duration = data.duration;
    if (data.retries !== undefined) updates.retries = data.retries;
    if (data.quarantineReason !== undefined) updates.quarantine_reason = data.quarantineReason;
    if (data.quarantineExpiresAt !== undefined) updates.quarantine_expires_at = data.quarantineExpiresAt;
    if (data.startedAt !== undefined) updates.started_at = data.startedAt;
    if (data.endedAt !== undefined) updates.ended_at = data.endedAt;

    const result = await supabase.from('test_runs').update(updates).eq('id', id).select().maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  },
};

// TestResult Model (step-level details)
export const TestResult = {
  create: async (data, client = null) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('test_results').insert({
      id,
      test_run_id: data.testRunId,
      build_id: data.buildId,
      step_number: data.stepNumber,
      step_title: data.stepTitle,
      status: data.status,
      duration: data.duration || 0,
      error: data.error || null,
      error_location: data.errorLocation || null,
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findByTestRunId: async (testRunId) => {
    const result = await supabase.from('test_results').select('*').eq('test_run_id', testRunId).order('step_number', { ascending: true });
    return result.data || [];
  },
};

// Artifact Model
export const Artifact = {
  create: async (data, client = null) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('artifacts').insert({
      id,
      test_run_id: data.testRunId,
      build_id: data.buildId,
      type: data.type, // screenshot, video, trace, etc
      name: data.name,
      path: data.path,
      url: data.url,
      size: data.size || 0,
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findByTestRunId: async (testRunId) => {
    const result = await supabase.from('artifacts').select('*').eq('test_run_id', testRunId).order('created_at', { ascending: false });
    return result.data || [];
  },

  findByBuildId: async (buildId) => {
    const result = await supabase.from('artifacts').select('*').eq('build_id', buildId).order('created_at', { ascending: false });
    return result.data || [];
  },
};

// FlakyTest Model
export const FlakyTest = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('flaky_tests').insert({
      id,
      test_name: data.testName,
      file: data.file,
      flakiness_score: data.flakinessScore || 0,
      failure_count: 1,
      total_runs: 1,
      last_seen: now,
      created_at: now,
      updated_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findByTestName: async (testName, file) => {
    const result = await supabase.from('flaky_tests').select('*').eq('test_name', testName).eq('file', file).maybeSingle();
    return result.data || null;
  },

  updateFlakiness: async (id, data) => {
    const result = await supabase.from('flaky_tests').update({
      failure_count: data.failureCount,
      total_runs: data.totalRuns,
      flakiness_score: data.flakinessScore,
      last_seen: new Date(),
      updated_at: new Date(),
    }).eq('id', id).select().maybeSingle();

    if (result.error) throw result.error;
    return result.data;
  },

  list: async (limit = 50, offset = 0) => {
    const result = await supabase.from('flaky_tests').select('*').order('flakiness_score', { ascending: false }).range(offset, offset + limit - 1);
    return result.data || [];
  },
};

// Metrics Model
export const Metrics = {
  create: async (data, client = null) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('metrics').insert({
      id,
      build_id: data.buildId,
      metric_type: data.metricType,
      metric_key: data.metricKey,
      metric_value: data.metricValue,
      recorded_at: data.recordedAt || now,
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  findByBuildId: async (buildId) => {
    const result = await supabase.from('metrics').select('*').eq('build_id', buildId).order('recorded_at', { ascending: false });
    return result.data || [];
  },

  getTimeSeries: async (metricKey, startDate, endDate, limit = 1000) => {
    const result = await supabase.from('metrics').select('*').eq('metric_key', metricKey).gte('recorded_at', startDate).lte('recorded_at', endDate).order('recorded_at', { ascending: false }).limit(limit);
    return result.data || [];
  },
};

// Action Model (for quarantine, skip, tags, etc)
export const Action = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('actions').insert({
      id,
      action_type: data.actionType, // quarantine, skip, add_tag
      test_name: data.testName,
      file: data.file,
      rule: data.rule ? JSON.stringify(data.rule) : null,
      status: 'active',
      created_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  list: async (limit = 1000) => {
    const result = await supabase.from('actions').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(limit);
    return result.data || [];
  },

  deactivate: async (id) => {
    const result = await supabase.from('actions').update({ status: 'inactive', updated_at: new Date() }).eq('id', id).select().maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  },
};

// ConditionalRule Model
export const ConditionalRule = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const result = await supabase.from('conditional_execution_rules').insert({
      id,
      name: data.name,
      condition: data.condition,
      action: data.action,
      enabled: data.enabled,
      created_at: now,
      updated_at: now,
    }).select().single();

    if (result.error) throw result.error;
    return result.data;
  },

  list: async (limit = 1000) => {
    const result = await supabase.from('conditional_execution_rules').select('*').order('name', { ascending: true }).limit(limit);
    return result.data || [];
  },

  update: async (id, data) => {
    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.condition !== undefined) updates.condition = data.condition;
    if (data.action !== undefined) updates.action = data.action;
    if (data.enabled !== undefined) updates.enabled = data.enabled;
    if (data.updatedAt !== undefined) updates.updated_at = data.updatedAt;

    const result = await supabase.from('conditional_execution_rules').update(updates).eq('id', id).select().maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  },

  delete: async (id) => {
    const result = await supabase.from('conditional_execution_rules').delete().eq('id', id).select();
    return result.data?.[0] || null;
  },
};

export default {
  Build,
  TestRun,
  TestResult,
  Artifact,
  FlakyTest,
  Metrics,
  Action,
  ConditionalRule,
};
