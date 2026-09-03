/**
 * AI Analysis Model
 * Manages persisting and retrieving AI root cause diagnoses for test runs.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, query, queryOne, queryAll } from '../config/database.js';

export const AiAnalysis = {
  create: async (data) => {
    const id = uuidv4();
    const now = new Date();

    const insertData = {
      id,
      test_run_id: data.testRunId,
      provider: data.provider,
      model: data.model,
      category: data.category,
      confidence_score: data.confidenceScore || 85,
      summary: data.summary,
      root_cause_details: data.rootCauseDetails || null,
      suggested_fix: typeof data.suggestedFix === 'object' ? data.suggestedFix : { code: data.suggestedFix },
      prevention_tips: Array.isArray(data.preventionTips) ? data.preventionTips : [],
      latency_ms: data.latencyMs || 0,
      created_at: now,
      updated_at: now,
    };

    try {
      const result = await supabase.from('test_ai_analyses').insert(insertData).select().maybeSingle();
      if (result.data) return result.data;
    } catch (_) {}

    // Direct SQL fallback
    const sql = `
      INSERT INTO test_ai_analyses (
        id, test_run_id, provider, model, category, confidence_score,
        summary, root_cause_details, suggested_fix, prevention_tips, latency_ms, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      id,
      insertData.test_run_id,
      insertData.provider,
      insertData.model,
      insertData.category,
      insertData.confidence_score,
      insertData.summary,
      insertData.root_cause_details,
      JSON.stringify(insertData.suggested_fix),
      insertData.prevention_tips,
      insertData.latency_ms,
      now,
      now,
    ];

    const fallback = await queryOne(sql, values);
    return fallback || insertData;
  },

  findByTestRunId: async (testRunId) => {
    try {
      const result = await supabase
        .from('test_ai_analyses')
        .select('*')
        .eq('test_run_id', testRunId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (result.data) {
        return {
          ...result.data,
          suggestedFix: typeof result.data.suggested_fix === 'string'
            ? JSON.parse(result.data.suggested_fix)
            : result.data.suggested_fix,
        };
      }
    } catch (_) {}

    const sql = `
      SELECT * FROM test_ai_analyses
      WHERE test_run_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const row = await queryOne(sql, [testRunId]);
    if (!row) return null;

    return {
      ...row,
      suggestedFix: typeof row.suggested_fix === 'string' ? JSON.parse(row.suggested_fix) : row.suggested_fix,
    };
  },

  deleteByTestRunId: async (testRunId) => {
    try {
      await supabase.from('test_ai_analyses').delete().eq('test_run_id', testRunId);
    } catch (_) {}

    await query(`DELETE FROM test_ai_analyses WHERE test_run_id = $1`, [testRunId]);
    return true;
  },
};

export default AiAnalysis;
