// Mock dependencies
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  Build: {
    findById: jest.fn(),
  },
  TestRun: {
    findByBuildId: jest.fn(),
  },
  TestResult: {
    findByTestRunId: jest.fn(),
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

import { buildComparisonService, getCanonicalTestKey } from '../../services/buildComparisonService.js';
import { Build, TestRun, TestResult } from '../../models/index.js';

describe('buildComparisonService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCanonicalTestKey', () => {
    it('should generate canonical key with file and title', () => {
      const key = getCanonicalTestKey({ file: 'tests/auth.spec.ts', title: 'should login user' });
      expect(key).toBe('tests/auth.spec.ts > should login user');
    });

    it('should fallback to name if title is missing', () => {
      const key = getCanonicalTestKey({ file: 'tests/auth.spec.ts', name: 'auth.spec.ts: login' });
      expect(key).toBe('tests/auth.spec.ts > auth.spec.ts: login');
    });

    it('should fallback to test id or unknown-test if file is missing', () => {
      const key = getCanonicalTestKey({ id: 'test-123' });
      expect(key).toBe('test-123');
    });
  });

  describe('compareBuilds', () => {
    const mockBaseBuild = {
      id: 'base-1',
      name: 'Base CI Run',
      branch: 'main',
      commit_hash: 'abc1234',
      status: 'passed',
      environment: 'ci',
    };

    const mockTargetBuild = {
      id: 'target-1',
      name: 'PR Run',
      branch: 'feat/checkout',
      commit_hash: 'def5678',
      status: 'failed',
      environment: 'ci',
    };

    it('should reject if baseBuildId or targetBuildId is missing', async () => {
      await expect(buildComparisonService.compareBuilds(null, 'target-1')).rejects.toThrow(
        'Both baseBuildId and targetBuildId are required'
      );
    });

    it('should throw if base build is not found', async () => {
      Build.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTargetBuild);
      await expect(buildComparisonService.compareBuilds('non-existent', 'target-1')).rejects.toThrow(
        'Base build with ID "non-existent" not found'
      );
    });

    it('should accurately detect regressions, fixes, duration changes, and consistency', async () => {
      Build.findById.mockImplementation((id) => {
        if (id === 'base-1') return Promise.resolve(mockBaseBuild);
        if (id === 'target-1') return Promise.resolve(mockTargetBuild);
        return Promise.resolve(null);
      });

      // Base runs:
      // 1. Regression candidate: passed in base, will fail in target
      // 2. Fix candidate: failed in base, will pass in target
      // 3. Consistent pass: passed in base, passes in target
      // 4. Consistent failure: failed in base, fails in target
      // 5. Duration regression: 1000ms in base, 2500ms in target
      // 6. Removed in target: exists only in base
      TestRun.findByBuildId.mockImplementation((buildId) => {
        if (buildId === 'base-1') {
          return Promise.resolve([
            { id: 'b-r1', file: 'auth.spec.ts', title: 'login test', status: 'passed', duration: 800 },
            { id: 'b-r2', file: 'cart.spec.ts', title: 'checkout item', status: 'failed', duration: 1200, error: 'Checkout button disabled' },
            { id: 'b-r3', file: 'nav.spec.ts', title: 'view menu', status: 'passed', duration: 300 },
            { id: 'b-r4', file: 'search.spec.ts', title: 'filter facets', status: 'failed', duration: 900, error: 'Facet timeout' },
            { id: 'b-r5', file: 'heavy.spec.ts', title: 'render big table', status: 'passed', duration: 1000 },
            { id: 'b-r6', file: 'legacy.spec.ts', title: 'old deprecation check', status: 'passed', duration: 200 },
          ]);
        }
        if (buildId === 'target-1') {
          return Promise.resolve([
            // 1. Regression (passed -> failed)
            { id: 't-r1', file: 'auth.spec.ts', title: 'login test', status: 'failed', duration: 950, error: 'Invalid password error' },
            // 2. Fixed (failed -> passed)
            { id: 't-r2', file: 'cart.spec.ts', title: 'checkout item', status: 'passed', duration: 1100 },
            // 3. Consistent pass (passed -> passed)
            { id: 't-r3', file: 'nav.spec.ts', title: 'view menu', status: 'passed', duration: 320 },
            // 4. Consistent failure (failed -> failed)
            { id: 't-r4', file: 'search.spec.ts', title: 'filter facets', status: 'failed', duration: 920, error: 'Facet timeout' },
            // 5. Duration regression (1000ms -> 2500ms, +150%)
            { id: 't-r5', file: 'heavy.spec.ts', title: 'render big table', status: 'passed', duration: 2500 },
            // 7. Newly added test in target
            { id: 't-r7', file: 'promo.spec.ts', title: 'apply coupon code', status: 'passed', duration: 600 },
          ]);
        }
        return Promise.resolve([]);
      });

      TestResult.findByTestRunId.mockResolvedValue([]);

      const result = await buildComparisonService.compareBuilds('base-1', 'target-1');

      expect(result.summary.regressionsCount).toBe(1);
      expect(result.regressions[0].title).toBe('login test');
      expect(result.regressions[0].statusDelta).toBe('regression');

      expect(result.summary.fixesCount).toBe(1);
      expect(result.fixes[0].title).toBe('checkout item');
      expect(result.fixes[0].statusDelta).toBe('fix');

      expect(result.summary.consistentFailuresCount).toBe(1);
      expect(result.consistentFailures[0].title).toBe('filter facets');

      expect(result.summary.consistentPassesCount).toBe(2); // nav.spec.ts and heavy.spec.ts

      expect(result.summary.durationRegressionsCount).toBe(1);
      expect(result.durationRegressions[0].title).toBe('render big table');
      expect(result.durationRegressions[0].durationDelta).toBe(1500);
      expect(result.durationRegressions[0].durationPercentChange).toBe(150);

      expect(result.summary.addedCount).toBe(1);
      expect(result.added[0].title).toBe('apply coupon code');

      expect(result.summary.removedCount).toBe(1);
      expect(result.removed[0].title).toBe('old deprecation check');

      expect(result.summary.baseTestCount).toBe(6);
      expect(result.summary.targetTestCount).toBe(6);
      expect(result.summary.testCountDelta).toBe(0);
    });
  });
});
