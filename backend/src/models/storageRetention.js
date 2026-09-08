/**
 * Storage Retention Policy Model
 */

import { query, queryOne } from '../config/database.js';

export const StoragePolicy = {
  /**
   * Get active policy for a project (or global fallback)
   */
  get: async (projectId = null) => {
    let sql = `SELECT * FROM storage_retention_policies WHERE project_id = $1 LIMIT 1`;
    let params = [projectId];

    if (!projectId) {
      sql = `SELECT * FROM storage_retention_policies WHERE project_id IS NULL LIMIT 1`;
      params = [];
    }

    let policy = await queryOne(sql, params);

    // If project has no custom policy yet, fallback to global
    if (!policy && projectId) {
      policy = await queryOne(`SELECT * FROM storage_retention_policies WHERE project_id IS NULL LIMIT 1`);
    }

    if (!policy) {
      // Hardcoded fallback defaults if table was empty
      return {
        id: null,
        project_id: projectId,
        tier: 'custom',
        artifacts_passed_days: 7,
        artifacts_failed_days: 21,
        test_results_days: 90,
        test_details_days: 30,
        reports_analytics_days: 365,
        byos_enabled: false,
        byos_provider: 's3',
        byos_config: {},
        auto_purge_enabled: true,
        last_cleanup_at: null,
      };
    }

    return policy;
  },

  /**
   * Upsert retention policy for project or global
   */
  upsert: async (projectId = null, data = {}) => {
    const existing = await StoragePolicy.get(projectId);
    const existingConfig = existing?.byos_config || {};

    let byosConfig = data.byos_config || {};
    // Preserve existing secret key if masked
    if (byosConfig.secret_key && byosConfig.secret_key.includes('••••')) {
      byosConfig.secret_key = existingConfig.secret_key;
    }
    if (byosConfig.secretKey && byosConfig.secretKey.includes('••••')) {
      byosConfig.secretKey = existingConfig.secretKey || existingConfig.secret_key;
    }

    const tier = data.tier || existing?.tier || 'custom';
    const artifactsPassedDays = data.artifacts_passed_days !== undefined ? data.artifacts_passed_days : (existing?.artifacts_passed_days ?? 7);
    const artifactsFailedDays = data.artifacts_failed_days !== undefined ? data.artifacts_failed_days : (existing?.artifacts_failed_days ?? 21);
    const testResultsDays = data.test_results_days !== undefined ? data.test_results_days : (existing?.test_results_days ?? 90);
    const testDetailsDays = data.test_details_days !== undefined ? data.test_details_days : (existing?.test_details_days ?? 30);
    const reportsAnalyticsDays = data.reports_analytics_days !== undefined ? data.reports_analytics_days : (existing?.reports_analytics_days ?? 365);
    const byosEnabled = data.byos_enabled !== undefined ? !!data.byos_enabled : (existing?.byos_enabled ?? false);
    const byosProvider = data.byos_provider || existing?.byos_provider || 's3';
    const autoPurgeEnabled = data.auto_purge_enabled !== undefined ? !!data.auto_purge_enabled : (existing?.auto_purge_enabled ?? true);

    if (existing && existing.id && ((projectId && existing.project_id === projectId) || (!projectId && !existing.project_id))) {
      const updateSql = `
        UPDATE storage_retention_policies
        SET
          tier = $1,
          artifacts_passed_days = $2,
          artifacts_failed_days = $3,
          test_results_days = $4,
          test_details_days = $5,
          reports_analytics_days = $6,
          byos_enabled = $7,
          byos_provider = $8,
          byos_config = $9,
          auto_purge_enabled = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *;
      `;
      const result = await queryOne(updateSql, [
        tier,
        artifactsPassedDays,
        artifactsFailedDays,
        testResultsDays,
        testDetailsDays,
        reportsAnalyticsDays,
        byosEnabled,
        byosProvider,
        JSON.stringify(byosConfig),
        autoPurgeEnabled,
        existing.id,
      ]);
      return result;
    } else {
      const insertSql = `
        INSERT INTO storage_retention_policies (
          project_id,
          tier,
          artifacts_passed_days,
          artifacts_failed_days,
          test_results_days,
          test_details_days,
          reports_analytics_days,
          byos_enabled,
          byos_provider,
          byos_config,
          auto_purge_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const result = await queryOne(insertSql, [
        projectId || null,
        tier,
        artifactsPassedDays,
        artifactsFailedDays,
        testResultsDays,
        testDetailsDays,
        reportsAnalyticsDays,
        byosEnabled,
        byosProvider,
        JSON.stringify(byosConfig),
        autoPurgeEnabled,
      ]);
      return result;
    }
  },

  /**
   * Update last cleanup timestamp
   */
  updateLastCleanup: async (policyId) => {
    if (!policyId) return;
    await query(`UPDATE storage_retention_policies SET last_cleanup_at = NOW() WHERE id = $1`, [policyId]);
  },

  /**
   * Compute comprehensive storage usage metrics
   */
  getStorageUsageStats: async (projectId = null) => {
    // 1. Total artifacts size & counts
    let artSql = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(size), 0) as total_bytes,
        COUNT(*) FILTER (WHERE type = 'screenshot') as screenshot_count,
        COALESCE(SUM(size) FILTER (WHERE type = 'screenshot'), 0) as screenshot_bytes,
        COUNT(*) FILTER (WHERE type = 'video') as video_count,
        COALESCE(SUM(size) FILTER (WHERE type = 'video'), 0) as video_bytes,
        COUNT(*) FILTER (WHERE type = 'trace') as trace_count,
        COALESCE(SUM(size) FILTER (WHERE type = 'trace'), 0) as trace_bytes,
        COUNT(*) FILTER (WHERE type NOT IN ('screenshot', 'video', 'trace')) as other_count,
        COALESCE(SUM(size) FILTER (WHERE type NOT IN ('screenshot', 'video', 'trace')), 0) as other_bytes
      FROM artifacts
    `;
    const artRes = await queryOne(artSql);

    // 2. Test run counts
    const testRunsRes = await queryOne(`SELECT COUNT(*) as total_test_runs FROM test_runs`);
    const buildsRes = await queryOne(`SELECT COUNT(*) as total_builds FROM builds`);

    // 3. Expired candidates check based on active policy
    const policy = await StoragePolicy.get(projectId);
    let expiredPassedCount = 0;
    let expiredFailedCount = 0;
    let expiredTestRunsCount = 0;

    if (policy.artifacts_passed_days !== null) {
      const expPassed = await queryOne(`
        SELECT COUNT(a.id) as count
        FROM artifacts a
        JOIN test_runs tr ON a.test_run_id = tr.id
        WHERE tr.status = 'passed'
          AND a.created_at < NOW() - ($1 || ' days')::INTERVAL
      `, [policy.artifacts_passed_days]);
      expiredPassedCount = parseInt(expPassed?.count || 0, 10);
    }

    if (policy.artifacts_failed_days !== null) {
      const expFailed = await queryOne(`
        SELECT COUNT(a.id) as count
        FROM artifacts a
        JOIN test_runs tr ON a.test_run_id = tr.id
        WHERE tr.status IN ('failed', 'flaky', 'quarantined')
          AND a.created_at < NOW() - ($1 || ' days')::INTERVAL
      `, [policy.artifacts_failed_days]);
      expiredFailedCount = parseInt(expFailed?.count || 0, 10);
    }

    if (policy.test_results_days !== null) {
      const expRuns = await queryOne(`
        SELECT COUNT(id) as count
        FROM test_runs
        WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
      `, [policy.test_results_days]);
      expiredTestRunsCount = parseInt(expRuns?.count || 0, 10);
    }

    return {
      totalArtifacts: parseInt(artRes?.total_count || 0, 10),
      totalBytes: parseInt(artRes?.total_bytes || 0, 10),
      breakdown: {
        screenshots: {
          count: parseInt(artRes?.screenshot_count || 0, 10),
          bytes: parseInt(artRes?.screenshot_bytes || 0, 10),
        },
        videos: {
          count: parseInt(artRes?.video_count || 0, 10),
          bytes: parseInt(artRes?.video_bytes || 0, 10),
        },
        traces: {
          count: parseInt(artRes?.trace_count || 0, 10),
          bytes: parseInt(artRes?.trace_bytes || 0, 10),
        },
        other: {
          count: parseInt(artRes?.other_count || 0, 10),
          bytes: parseInt(artRes?.other_bytes || 0, 10),
        },
      },
      counts: {
        builds: parseInt(buildsRes?.total_builds || 0, 10),
        testRuns: parseInt(testRunsRes?.total_test_runs || 0, 10),
      },
      expiredCandidates: {
        passedArtifacts: expiredPassedCount,
        failedArtifacts: expiredFailedCount,
        testRuns: expiredTestRunsCount,
        totalEligibleForCleanup: expiredPassedCount + expiredFailedCount,
      },
      lastCleanupAt: policy.last_cleanup_at || null,
    };
  },
};

export default StoragePolicy;
