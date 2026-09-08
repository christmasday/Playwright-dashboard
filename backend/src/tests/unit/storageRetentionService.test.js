jest.mock('../../config/env.js', () => ({
  __esModule: true,
  default: {
    FRONTEND_URL: 'http://localhost:5173',
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

jest.mock('../../models/storageRetention.js', () => ({
  __esModule: true,
  StoragePolicy: {
    get: jest.fn(),
    upsert: jest.fn(),
    updateLastCleanup: jest.fn(),
    getStorageUsageStats: jest.fn(),
  },
}));

jest.mock('../../config/database.js', () => ({
  __esModule: true,
  query: jest.fn(),
  queryOne: jest.fn(),
}));

import {
  maskSecretKey,
  formatTimeframe,
  getEffectivePolicy,
  savePolicy,
  testByosConnection,
  runRetentionCleanup,
} from '../../services/storageRetentionService.js';
import { StoragePolicy } from '../../models/storageRetention.js';
import { query, queryOne } from '../../config/database.js';

describe('storageRetentionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatTimeframe', () => {
    it('formats null as Unlimited', () => {
      expect(formatTimeframe(null)).toBe('Unlimited');
      expect(formatTimeframe(undefined)).toBe('Unlimited');
    });

    it('formats single and multiple days', () => {
      expect(formatTimeframe(1)).toBe('1 day');
      expect(formatTimeframe(7)).toBe('7 days');
      expect(formatTimeframe(30)).toBe('30 days');
    });

    it('formats full years', () => {
      expect(formatTimeframe(365)).toBe('1 year');
      expect(formatTimeframe(730)).toBe('2 years');
    });
  });

  describe('maskSecretKey', () => {
    it('masks secret key preserving last 4 characters', () => {
      expect(maskSecretKey('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')).toBe('••••••••EKEY');
    });

    it('returns empty string for empty input', () => {
      expect(maskSecretKey('')).toBe('');
      expect(maskSecretKey(null)).toBe('');
    });
  });

  describe('getEffectivePolicy', () => {
    it('fetches policy and masks BYOS secrets', async () => {
      StoragePolicy.get.mockResolvedValue({
        id: 'pol-1',
        tier: 'custom',
        artifacts_passed_days: 14,
        artifacts_failed_days: 30,
        test_results_days: 90,
        byos_enabled: true,
        byos_config: {
          bucket: 'playwright-artifacts',
          secret_key: 'topsecretkey1234',
        },
      });
      StoragePolicy.getStorageUsageStats.mockResolvedValue({
        totalArtifacts: 42,
        totalBytes: 1048576,
      });

      const result = await getEffectivePolicy(null);

      expect(result.policy.artifacts_passed_days).toBe(14);
      expect(result.policy.byos_config.secret_key).toBe('••••••••1234');
      expect(result.presets.starter.artifacts_passed_days).toBe(7);
      expect(result.stats.totalArtifacts).toBe(42);
    });
  });

  describe('savePolicy', () => {
    it('validates ranges and updates retention policy', async () => {
      StoragePolicy.upsert.mockResolvedValue({
        id: 'pol-1',
        artifacts_passed_days: 14,
        artifacts_failed_days: 60,
        test_results_days: 180,
      });

      const updated = await savePolicy('proj-1', {
        artifacts_passed_days: 14,
        artifacts_failed_days: 60,
        test_results_days: 180,
      });

      expect(StoragePolicy.upsert).toHaveBeenCalledWith('proj-1', {
        artifacts_passed_days: 14,
        artifacts_failed_days: 60,
        test_results_days: 180,
      });
      expect(updated.artifacts_passed_days).toBe(14);
    });

    it('throws error for invalid timeframe range (< 1 day or > 3650 days)', async () => {
      await expect(
        savePolicy('proj-1', { artifacts_passed_days: -5 })
      ).rejects.toThrow('Artifacts (Passed Tests) must be between 1 and 3650 days');

      await expect(
        savePolicy('proj-1', { test_results_days: 5000 })
      ).rejects.toThrow('Test Results must be between 1 and 3650 days');
    });
  });

  describe('testByosConnection', () => {
    it('validates mock bucket connection successfully', async () => {
      const res = await testByosConnection({
        provider: 's3',
        bucket: 'mock-playwright-bucket',
        region: 'eu-central-1',
      });

      expect(res.success).toBe(true);
      expect(res.bucket).toBe('mock-playwright-bucket');
    });

    it('rejects missing bucket name', async () => {
      await expect(testByosConnection({ provider: 's3', bucket: '' })).rejects.toThrow(
        'Storage bucket name is required'
      );
    });
  });

  describe('runRetentionCleanup', () => {
    it('identifies and reports expired artifacts during dry run', async () => {
      StoragePolicy.get.mockResolvedValue({
        id: 'pol-1',
        artifacts_passed_days: 7,
        artifacts_failed_days: 21,
        test_details_days: 30,
      });

      query.mockImplementation((sql) => {
        if (sql.includes("status = 'passed'")) {
          return Promise.resolve({
            data: [
              { id: 'art-1', path: '/tmp/art-1.png', size: 1000 },
              { id: 'art-2', path: '/tmp/art-2.png', size: 2000 },
            ],
          });
        }
        if (sql.includes("status IN ('failed'")) {
          return Promise.resolve({
            data: [{ id: 'art-3', path: '/tmp/art-3.webm', size: 5000 }],
          });
        }
        return Promise.resolve({ data: [] });
      });

      queryOne.mockResolvedValue({ count: 12 });

      const report = await runRetentionCleanup({ dryRun: true, projectId: 'proj-1' });

      expect(report.success).toBe(true);
      expect(report.dryRun).toBe(true);
      expect(report.purgedPassedArtifacts).toBe(2);
      expect(report.purgedFailedArtifacts).toBe(1);
      expect(report.purgedArtifactsCount).toBe(3);
      expect(report.purgedTestResults).toBe(12);
      expect(report.freedBytes).toBe(8000);
      expect(StoragePolicy.updateLastCleanup).not.toHaveBeenCalled();
    });
  });
});
