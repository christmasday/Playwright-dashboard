/**
 * Flaky Controller Unit Tests
 */

jest.mock('../../services/flakyAnalysisEngine.js', () => ({
  __esModule: true,
  flakyAnalysisEngine: {
    getSummary: jest.fn(),
    getFlakyTests: jest.fn(),
    runAnalysisScan: jest.fn(),
    analyzeHistoricalRuns: jest.fn(),
    updateQuarantine: jest.fn(),
    getHistory: jest.fn(),
  },
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

import flakyController from '../../api/controllers/flakyController.js';
import { flakyAnalysisEngine } from '../../services/flakyAnalysisEngine.js';

describe('Flaky Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('getFlakySummary', () => {
    it('should return summary stats', async () => {
      flakyAnalysisEngine.getSummary.mockResolvedValue({ totalFlakyTests: 5, averageScore: 42 });
      await flakyController.getFlakySummary(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        summary: { totalFlakyTests: 5, averageScore: 42 },
      });
    });
  });

  describe('getFlakyTests', () => {
    it('should return paginated flaky tests with metadata', async () => {
      flakyAnalysisEngine.getFlakyTests.mockResolvedValue({
        tests: [{ id: 'ft-1', test_name: 'test 1', flakiness_score: 80 }],
        total: 25,
      });

      req = { query: { page: '2', limit: '10', severity: 'high' } };
      await flakyController.getFlakyTests(req, res, next);

      expect(flakyAnalysisEngine.getFlakyTests).toHaveBeenCalledWith({
        status: undefined,
        severity: 'high',
        search: undefined,
        limit: 10,
        offset: 10,
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        tests: [{ id: 'ft-1', test_name: 'test 1', flakiness_score: 80 }],
      });
    });
  });

  describe('updateQuarantine', () => {
    it('should update quarantine status', async () => {
      flakyAnalysisEngine.updateQuarantine.mockResolvedValue({ id: 'ft-1', quarantine_status: 'quarantined' });
      req = {
        params: { id: 'ft-1' },
        body: { quarantineStatus: 'quarantined', notes: 'flake note' },
        user: { email: 'admin@example.com' },
      };

      await flakyController.updateQuarantine(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        flakyTest: { id: 'ft-1', quarantine_status: 'quarantined' },
      });
    });

    it('should reject invalid quarantine status', async () => {
      req = {
        params: { id: 'ft-1' },
        body: { quarantineStatus: 'invalid_status' },
      };

      await flakyController.updateQuarantine(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
