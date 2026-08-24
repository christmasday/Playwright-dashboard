
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  TestRun: {
    findById: jest.fn(),
    findByBuildId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  TestResult: {
    findByTestRunId: jest.fn(),
    create: jest.fn(),
  },
  Artifact: {
    findByTestRunId: jest.fn(),
    findByBuildId: jest.fn(),
    create: jest.fn(),
  },
  FlakyTest: {
    list: jest.fn(),
    findByTestName: jest.fn(),
    create: jest.fn(),
    updateFlakiness: jest.fn(),
  },
  Build: {
    findById: jest.fn(),
  },
  Metrics: {
    create: jest.fn(),
  },
}));
jest.mock('../../config/database.js', () => ({
  __esModule: true,
  transaction: jest.fn((cb) => cb({})),
  query: jest.fn(),
}));
jest.mock('../../utils/playwrightParser.js', () => ({
  __esModule: true,
  calculateTestMetrics: jest.fn(() => ({
    total: 2,
    passed: 1,
    failed: 1,
    skipped: 0,
    totalDuration: 100,
    averageDuration: 50,
  })),
}));

import testService from '../../services/testService.js';
import { TestRun, TestResult, Artifact, FlakyTest, Build, Metrics } from '../../models/index.js';
import { transaction } from '../../config/database.js';

describe('Test Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestTestResults', () => {
    it('should process suites and return test runs', async () => {
      TestRun.create.mockResolvedValue({ id: 'tr1' });
      const report = {
        suites: [
          {
            title: 'Suite A',
            file: 'a.spec.js',
            tests: [
              { name: 't1', status: 'passed', duration: 10, tags: ['smoke'] },
            ],
          },
        ],
      };
      const result = await testService.ingestTestResults('b1', report);
      expect(transaction).toHaveBeenCalled();
      expect(TestRun.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getTestDetails', () => {
    it('should combine run, steps and artifacts', async () => {
      TestRun.findById.mockResolvedValue({ id: 'tr1', title: 'Test' });
      TestResult.findByTestRunId.mockResolvedValue([{ step: 's1' }]);
      Artifact.findByTestRunId.mockResolvedValue([{ type: 'screenshot' }]);

      const details = await testService.getTestDetails('tr1');
      expect(details.steps).toHaveLength(1);
      expect(details.artifacts).toHaveLength(1);
      expect(details.id).toBe('tr1');
    });

    it('should throw when test run not found', async () => {
      TestRun.findById.mockResolvedValue(null);
      await expect(testService.getTestDetails('missing')).rejects.toThrow(/not found/i);
    });
  });

  describe('getBuildSummary', () => {
    it('should compute statistics', async () => {
      Build.findById.mockResolvedValue({ id: 'b1' });
      TestRun.findByBuildId.mockResolvedValue([
        { status: 'passed', duration: 10 },
        { status: 'failed', duration: 20 },
      ]);
      Artifact.findByBuildId.mockResolvedValue([]);

      const summary = await testService.getBuildSummary('b1');
      expect(summary.stats.total).toBe(2);
      expect(summary.stats.passed).toBe(1);
      expect(summary.stats.failed).toBe(1);
      expect(summary.stats.passRate).toBe(50);
    });
  });

  describe('getFlakyTests', () => {
    it('should return flaky tests', async () => {
      FlakyTest.list.mockResolvedValue([{ id: 'f1' }]);
      const result = await testService.getFlakyTests(null, 50);
      expect(FlakyTest.list).toHaveBeenCalledWith(50);
      expect(result).toEqual([{ id: 'f1' }]);
    });
  });

  describe('updateFlakiness', () => {
    it('should create a new flaky test entry when none exists', async () => {
      FlakyTest.findByTestName.mockResolvedValue(null);
      FlakyTest.create.mockResolvedValue({ id: 'f1' });
      await testService.updateFlakiness('Test A', 'a.spec.js', 1, 2);
      expect(FlakyTest.create).toHaveBeenCalledWith(
        expect.objectContaining({ testName: 'Test A', flakinessScore: 50 })
      );
    });

    it('should update an existing flaky test entry', async () => {
      FlakyTest.findByTestName.mockResolvedValue({
        id: 'f1',
        failure_count: '1',
        total_runs: '2',
      });
      FlakyTest.updateFlakiness.mockResolvedValue({ id: 'f1' });
      await testService.updateFlakiness('Test A', 'a.spec.js', 1, 2);
      expect(FlakyTest.updateFlakiness).toHaveBeenCalled();
    });
  });
});
