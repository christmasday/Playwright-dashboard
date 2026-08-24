jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/analyticsService.js', () => ({
  __esModule: true,
  analyticsService: {
    getOverview: jest.fn(),
    getPerformanceTrends: jest.fn(),
    getSlowestTests: jest.fn(),
    getFlakinessInsights: jest.fn(),
    getDistribution: jest.fn(),
    getSpecHealth: jest.fn(),
    getExportData: jest.fn(),
  },
}));

import analyticsController from '../../api/controllers/analyticsController.js';
import { analyticsService } from '../../services/analyticsService.js';

describe('Analytics Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  describe('getOverview', () => {
    it('should return overview data successfully', async () => {
      analyticsService.getOverview.mockResolvedValue({
        passRate: 98.5,
        stabilityIndex: 95.2,
        totalTestRuns: 120,
      });
      req = { query: { timeRange: '30d' } };

      await analyticsController.getOverview(req, res, next);

      expect(analyticsService.getOverview).toHaveBeenCalledWith({
        projectId: undefined,
        timeRange: '30d',
        environment: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ passRate: 98.5 }),
      });
    });

    it('should pass errors to next handler', async () => {
      const err = new Error('Database query failure');
      analyticsService.getOverview.mockRejectedValue(err);
      req = { query: {} };

      await analyticsController.getOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getPerformanceTrends', () => {
    it('should return trends array', async () => {
      analyticsService.getPerformanceTrends.mockResolvedValue([
        { date: '2026-08-20', passRate: 100 },
      ]);
      req = { query: { projectId: 'p1', timeRange: '7d' } };

      await analyticsController.getPerformanceTrends(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ date: '2026-08-20', passRate: 100 }],
      });
    });
  });

  describe('getSlowestTests', () => {
    it('should return top slowest tests', async () => {
      analyticsService.getSlowestTests.mockResolvedValue([
        { testName: 'Checkout flow', avgDuration: 12000 },
      ]);
      req = { query: { limit: '5' } };

      await analyticsController.getSlowestTests(req, res, next);

      expect(analyticsService.getSlowestTests).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ testName: 'Checkout flow', avgDuration: 12000 }],
      });
    });
  });

  describe('exportReport', () => {
    it('should export CSV report with proper headers', async () => {
      analyticsService.getExportData.mockResolvedValue({
        data: 'file,runs,passRate\nauth.spec.ts,10,100%',
        contentType: 'text/csv',
        filename: 'qa-analytics-report-30d.csv',
      });
      req = { query: { format: 'csv', timeRange: '30d' } };

      await analyticsController.exportReport(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="qa-analytics-report-30d.csv"');
      expect(res.send).toHaveBeenCalledWith('file,runs,passRate\nauth.spec.ts,10,100%');
    });

    it('should export JSON report', async () => {
      analyticsService.getExportData.mockResolvedValue({
        data: { overview: { passRate: 98 } },
        contentType: 'application/json',
        filename: 'qa-analytics-report-30d.json',
      });
      req = { query: { format: 'json', timeRange: '30d' } };

      await analyticsController.exportReport(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.json).toHaveBeenCalledWith({ overview: { passRate: 98 } });
    });
  });
});
