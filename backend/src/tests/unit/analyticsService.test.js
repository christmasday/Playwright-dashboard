jest.mock('../../config/database.js', () => ({
  __esModule: true,
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { analyticsService } from '../../services/analyticsService.js';
import { query, queryOne } from '../../config/database.js';

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should compute overview metrics and stability index accurately', async () => {
      queryOne.mockResolvedValue({
        total_builds: '5',
        total_unique_tests: '10',
        total_test_runs: '100',
        passed_runs: '90',
        failed_runs: '10',
        quarantined_runs: '2',
        skipped_runs: '0',
        flaky_unique_tests: '2',
        flaky_test_runs: '20',
        avg_flakiness_score: '25.0',
        avg_duration_ms: '1500',
        p50_duration_ms: '1200',
        p90_duration_ms: '2500',
        p95_duration_ms: '3000',
        total_retries: '8',
      });

      const result = await analyticsService.getOverview({ timeRange: '7d' });

      expect(queryOne).toHaveBeenCalled();
      expect(result.totalBuilds).toBe(5);
      expect(result.totalTestRuns).toBe(100);
      expect(result.passRate).toBe(90);
      expect(result.failureRate).toBe(10);
      expect(result.flakinessRate).toBe(5);
      expect(result.stabilityIndex).toBe(92);
      expect(result.duration.avg).toBe(1500);
      expect(result.duration.p95).toBe(3000);
    });

    it('should handle empty dataset gracefully', async () => {
      queryOne.mockResolvedValue(null);

      const result = await analyticsService.getOverview({ timeRange: '30d' });

      expect(result.totalTestRuns).toBe(0);
      expect(result.passRate).toBe(0);
      expect(result.stabilityIndex).toBe(100);
      expect(result.duration.avg).toBe(0);
    });
  });

  describe('getPerformanceTrends', () => {
    it('should format time series points correctly', async () => {
      query.mockResolvedValue({
        data: [
          {
            date: '2026-08-20',
            builds_count: '2',
            total_runs: '40',
            passed: '38',
            failed: '2',
            flaky: '1',
            skipped: '0',
            avg_duration_ms: '1200',
            p95_duration_ms: '2100',
          },
        ],
      });

      const trends = await analyticsService.getPerformanceTrends({ timeRange: '14d' });

      expect(trends).toHaveLength(1);
      expect(trends[0].date).toBe('2026-08-20');
      expect(trends[0].passRate).toBe(95);
      expect(trends[0].p95Duration).toBe(2100);
    });
  });

  describe('getSlowestTests', () => {
    it('should return top slowest tests', async () => {
      query.mockResolvedValue({
        data: [
          {
            test_name: 'Slow Spec',
            file: 'slow.spec.ts',
            total_runs: '10',
            pass_count: '9',
            fail_count: '1',
            flaky_count: '0',
            avg_duration_ms: '15400',
            max_duration_ms: '22000',
            min_duration_ms: '12000',
            p95_duration_ms: '20000',
          },
        ],
      });

      const slowest = await analyticsService.getSlowestTests({ limit: 5 });

      expect(slowest).toHaveLength(1);
      expect(slowest[0].testName).toBe('Slow Spec');
      expect(slowest[0].avgDuration).toBe(15400);
      expect(slowest[0].maxDuration).toBe(22000);
    });
  });

  describe('getExportData', () => {
    it('should generate CSV formatted export', async () => {
      queryOne.mockResolvedValue({ total_test_runs: '10', passed_runs: '10' });
      query.mockResolvedValue({ data: [] });

      const exportResult = await analyticsService.getExportData({ format: 'csv', timeRange: '30d' });

      expect(exportResult.contentType).toBe('text/csv');
      expect(exportResult.filename).toContain('qa-analytics-report-30d.csv');
      expect(exportResult.data).toContain('Spec File,Total Runs,Passed,Failed');
    });
  });
});
