/**
 * Flaky Test Analysis Engine
 * Automated root-cause classification, score calculation, quarantine tracking, and analytics.
 */

import { query, queryOne } from '../config/database.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Categorizes failure root causes based on error message patterns.
 */
export const classifyError = (errorMessage) => {
  if (!errorMessage || typeof errorMessage !== 'string') return 'Unknown';
  const msg = errorMessage.toLowerCase();

  if (
    msg.includes('timeout') &&
    (msg.includes('locator') || msg.includes('element') || msg.includes('waiting for') || msg.includes('visible') || msg.includes('click'))
  ) {
    return 'Element Timeout';
  }
  if (msg.includes('navigation') || msg.includes('page.goto') || msg.includes('frame detached') || msg.includes('load event')) {
    return 'Navigation Timeout';
  }
  if (
    msg.includes('expect(') ||
    msg.includes('received') ||
    msg.includes('tostrictequal') ||
    msg.includes('tobe') ||
    msg.includes('toequal') ||
    msg.includes('assertion')
  ) {
    return 'Assertion Failure';
  }
  if (
    msg.includes('net::err') ||
    msg.includes('econnrefused') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  ) {
    return 'Network Error';
  }
  if (msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('conflict')) {
    return 'State Collision';
  }
  return 'Unknown';
};

/**
 * Calculates a normalized flakiness score percentage (0-100%).
 */
export const calculateFlakinessScore = ({ failureCount = 0, flakyCount = 0, totalRuns = 1 }) => {
  if (!totalRuns || totalRuns <= 0) return 0;
  // Flaky test runs (failed then passed on retry) are weighted double
  const rawWeightedScore = (flakyCount * 2 + failureCount) / totalRuns;
  return Math.min(100, Math.round(rawWeightedScore * 100 * 10) / 10);
};

export const flakyAnalysisEngine = {
  /**
   * Run automated historical scan across all test runs in the database
   */
  analyzeHistoricalRuns: async () => {
    try {
      logger.info('Starting Flaky Test Analysis Engine scan...');

      // 1. Group test runs by test name and file
      const runsQuery = `
        SELECT
          name AS test_name,
          file,
          COUNT(*) AS total_runs,
          COUNT(CASE WHEN status = 'passed' THEN 1 END) AS pass_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failure_count,
          COUNT(CASE WHEN status = 'flaky' THEN 1 END) AS flaky_count,
          MAX(started_at) AS last_seen
        FROM test_runs
        WHERE name IS NOT NULL AND name != ''
        GROUP BY name, file;
      `;

      const { data: testGroups } = await query(runsQuery);
      let analyzedCount = 0;

      for (const group of testGroups) {
        const totalRuns = parseInt(group.total_runs, 10) || 0;
        const failureCount = parseInt(group.failure_count, 10) || 0;
        const flakyCount = parseInt(group.flaky_count, 10) || 0;
        const passCount = parseInt(group.pass_count, 10) || 0;

        // Skip tests that have 100% clean passes without any flaky or failure flags
        if (failureCount === 0 && flakyCount === 0) {
          continue;
        }

        const score = calculateFlakinessScore({ failureCount, flakyCount, totalRuns });

        // 2. Fetch recent failure step error message for category classification
        const errorQuery = `
          SELECT tr.error
          FROM test_results tr
          JOIN test_runs r ON tr.test_run_id = r.id
          WHERE r.name = $1 AND (r.file = $2 OR $2 IS NULL) AND tr.error IS NOT NULL AND tr.error != ''
          ORDER BY r.created_at DESC
          LIMIT 1;
        `;
        const lastErrorRow = await queryOne(errorQuery, [group.test_name, group.file]);
        const lastError = lastErrorRow ? lastErrorRow.error : null;
        const category = classifyError(lastError);

        // 3. Upsert into flaky_tests
        const existing = await queryOne(
          'SELECT id, quarantine_status, notes FROM flaky_tests WHERE test_name = $1 AND (file = $2 OR $2 IS NULL)',
          [group.test_name, group.file]
        );

        if (existing) {
          await query(
            `UPDATE flaky_tests
             SET failure_count = $1,
                 total_runs = $2,
                 flakiness_score = $3,
                 pass_count = $4,
                 retry_count = $5,
                 failure_category = $6,
                 last_error_message = $7,
                 last_seen = $8,
                 updated_at = NOW()
             WHERE id = $9`,
            [
              failureCount + flakyCount,
              totalRuns,
              score,
              passCount,
              flakyCount,
              category,
              lastError,
              group.last_seen || new Date(),
              existing.id,
            ]
          );
        } else {
          await query(
            `INSERT INTO flaky_tests (
               id, test_name, file, failure_count, total_runs, flakiness_score,
               pass_count, retry_count, failure_category, last_error_message,
               quarantine_status, last_seen, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
            [
              uuidv4(),
              group.test_name,
              group.file,
              failureCount + flakyCount,
              totalRuns,
              score,
              passCount,
              flakyCount,
              category,
              lastError,
              'active',
              group.last_seen || new Date(),
            ]
          );
        }
        analyzedCount++;
      }

      logger.info(`Flaky Test Analysis Engine completed. Analyzed ${analyzedCount} flaky test candidates.`);
      return { success: true, analyzedCount };
    } catch (error) {
      logger.error('Flaky Test Analysis Engine failed', { error: error.message });
      throw error;
    }
  },

  /**
   * Get overall flaky summary statistics
   */
  getSummary: async () => {
    try {
      const totalRow = await queryOne('SELECT COUNT(*) AS count, AVG(flakiness_score) AS avg_score FROM flaky_tests');
      const highRiskRow = await queryOne('SELECT COUNT(*) AS count FROM flaky_tests WHERE flakiness_score > 50');
      const mediumRiskRow = await queryOne('SELECT COUNT(*) AS count FROM flaky_tests WHERE flakiness_score >= 20 AND flakiness_score <= 50');
      const quarantinedRow = await queryOne("SELECT COUNT(*) AS count FROM flaky_tests WHERE quarantine_status = 'quarantined'");
      const resolvedRow = await queryOne("SELECT COUNT(*) AS count FROM flaky_tests WHERE quarantine_status = 'resolved'");

      const categoryRows = await query(`
        SELECT failure_category, COUNT(*) AS count
        FROM flaky_tests
        GROUP BY failure_category
        ORDER BY count DESC
      `);

      return {
        totalFlakyTests: parseInt(totalRow.count, 10) || 0,
        averageScore: Math.round((parseFloat(totalRow.avg_score) || 0) * 10) / 10,
        highRiskCount: parseInt(highRiskRow.count, 10) || 0,
        mediumRiskCount: parseInt(mediumRiskRow.count, 10) || 0,
        quarantinedCount: parseInt(quarantinedRow.count, 10) || 0,
        resolvedCount: parseInt(resolvedRow.count, 10) || 0,
        categories: categoryRows.data.map((c) => ({
          category: c.failure_category,
          count: parseInt(c.count, 10),
        })),
      };
    } catch (error) {
      logger.error('Error fetching flaky summary', { error: error.message });
      throw error;
    }
  },

  /**
   * List flaky tests with optional filters, search, and pagination
   */
  getFlakyTests: async ({ status, severity, search, limit = 50, offset = 0 } = {}) => {
    try {
      let whereConditions = ['1=1'];
      const params = [];

      if (status && status !== 'all') {
        params.push(status);
        whereConditions.push(`quarantine_status = $${params.length}`);
      }

      if (severity === 'high') {
        whereConditions.push('flakiness_score > 50');
      } else if (severity === 'medium') {
        whereConditions.push('flakiness_score >= 20 AND flakiness_score <= 50');
      } else if (severity === 'low') {
        whereConditions.push('flakiness_score < 20');
      }

      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        whereConditions.push(`(test_name ILIKE $${params.length} OR file ILIKE $${params.length})`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Total count query
      const countSql = `SELECT COUNT(*) AS total FROM flaky_tests WHERE ${whereClause}`;
      const countRow = await queryOne(countSql, params);
      const total = parseInt(countRow?.total || 0, 10);

      // Data query
      const dataParams = [...params];
      dataParams.push(limit, offset);
      const sql = `
        SELECT * FROM flaky_tests 
        WHERE ${whereClause}
        ORDER BY flakiness_score DESC, last_seen DESC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
      `;

      const { data } = await query(sql, dataParams);
      return { tests: data || [], total };
    } catch (error) {
      logger.error('Error fetching flaky tests list', { error: error.message });
      throw error;
    }
  },

  /**
   * Update quarantine status & notes
   */
  updateQuarantine: async (id, { quarantineStatus, notes, userEmail }) => {
    try {
      const existing = await queryOne('SELECT * FROM flaky_tests WHERE id = $1', [id]);
      if (!existing) {
        throw new Error('Flaky test record not found');
      }

      const isQuarantined = quarantineStatus === 'quarantined';
      const result = await queryOne(
        `UPDATE flaky_tests
         SET quarantine_status = $1,
             notes = COALESCE($2, notes),
             quarantined_by = CASE WHEN $1 = 'quarantined' THEN $3 ELSE quarantined_by END,
             quarantined_at = CASE WHEN $1 = 'quarantined' THEN NOW() ELSE quarantined_at END,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [quarantineStatus, notes || null, userEmail || 'system', id]
      );

      logger.info(`Updated flaky test quarantine status`, { id, status: quarantineStatus, userEmail });
      return result;
    } catch (error) {
      logger.error('Error updating quarantine status', { id, error: error.message });
      throw error;
    }
  },

  /**
   * Get execution history timeline for a single flaky test
   */
  getHistory: async (id) => {
    try {
      const flakyTest = await queryOne('SELECT * FROM flaky_tests WHERE id = $1', [id]);
      if (!flakyTest) throw new Error('Flaky test not found');

      const historyQuery = `
        SELECT
          tr.id,
          tr.build_id,
          tr.status,
          tr.duration,
          tr.started_at,
          b.build_number,
          b.project_id
        FROM test_runs tr
        LEFT JOIN builds b ON tr.build_id = b.id
        WHERE tr.name = $1 AND (tr.file = $2 OR $2 IS NULL)
        ORDER BY tr.started_at DESC
        LIMIT 20;
      `;

      const { data: runs } = await query(historyQuery, [flakyTest.test_name, flakyTest.file]);
      return {
        flakyTest,
        runs,
      };
    } catch (error) {
      logger.error('Error fetching flaky test history', { id, error: error.message });
      throw error;
    }
  },
};

export default flakyAnalysisEngine;
