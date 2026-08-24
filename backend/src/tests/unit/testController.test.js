
// Mock models (avoids sequelize/pg) and testService
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  Build: { findById: jest.fn() },
  TestRun: { findByBuildId: jest.fn() },
}));
jest.mock('../../services/testService');

import testController from '../../api/controllers/testController.js';
import testService from '../../services/testService.js';
import { Build, TestRun } from '../../models/index.js';

describe('Test Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('ingestTestResults', () => {
    it('should ingest results and return 201', async () => {
      Build.findById.mockResolvedValue({ id: 'b1' });
      testService.ingestTestResults.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      req = { body: { buildId: 'b1', results: [{ name: 'a' }] } };

      await testController.ingestTestResults(req, res, next);

      expect(testService.ingestTestResults).toHaveBeenCalledWith('b1', [{ name: 'a' }]);
      expect(res.status).toHaveBeenCalledWith(201);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.testRunsCount).toBe(2);
    });

    it('should return 400 when buildId/results missing', async () => {
      req = { body: {} };
      await testController.ingestTestResults(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when build not found', async () => {
      Build.findById.mockResolvedValue(null);
      req = { body: { buildId: 'b1', results: [] } };
      await testController.ingestTestResults(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTestDetails', () => {
    it('should return test details', async () => {
      testService.getTestDetails.mockResolvedValue({ id: 't1', title: 'Test 1' });
      req = { params: { testRunId: 't1' } };
      await testController.getTestDetails(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ id: 't1', title: 'Test 1' });
    });

    it('should return 400 when testRunId missing', async () => {
      req = { params: {} };
      await testController.getTestDetails(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getBuildSummary', () => {
    it('should return build summary', async () => {
      testService.getBuildSummary.mockResolvedValue({ buildId: 'b1', total: 10 });
      req = { params: { buildId: 'b1' } };
      await testController.getBuildSummary(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ buildId: 'b1', total: 10 });
    });

    it('should return 400 when buildId missing', async () => {
      req = { params: {} };
      await testController.getBuildSummary(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getFlakyTests', () => {
    it('should return flaky tests with count', async () => {
      testService.getFlakyTests.mockResolvedValue([{ id: 'f1' }]);
      req = { query: { limit: '50' } };
      await testController.getFlakyTests(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.count).toBe(1);
      expect(body.tests).toEqual([{ id: 'f1' }]);
      expect(testService.getFlakyTests).toHaveBeenCalledWith(null, 50);
    });
  });

  describe('getTestsByStatus', () => {
    it('should filter tests by status', async () => {
      TestRun.findByBuildId.mockResolvedValue([
        { id: 't1', status: 'passed' },
        { id: 't2', status: 'failed' },
      ]);
      req = { query: { buildId: 'b1', status: 'failed', limit: '100' } };
      await testController.getTestsByStatus(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.count).toBe(1);
      expect(body.tests[0].id).toBe('t2');
    });

    it('should return 400 when buildId/status missing', async () => {
      req = { query: { buildId: 'b1' } };
      await testController.getTestsByStatus(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
