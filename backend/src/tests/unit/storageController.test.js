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

jest.mock('../../services/storageRetentionService.js', () => ({
  __esModule: true,
  default: {
    getEffectivePolicy: jest.fn(),
    savePolicy: jest.fn(),
    testByosConnection: jest.fn(),
    runRetentionCleanup: jest.fn(),
  },
}));

jest.mock('../../models/storageRetention.js', () => ({
  __esModule: true,
  StoragePolicy: {
    getStorageUsageStats: jest.fn(),
  },
}));

import * as storageController from '../../api/controllers/storageController.js';
import storageRetentionService from '../../services/storageRetentionService.js';
import { StoragePolicy } from '../../models/storageRetention.js';

describe('storageController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('getPolicy', () => {
    it('returns policy and presets', async () => {
      storageRetentionService.getEffectivePolicy.mockResolvedValue({
        policy: { id: 'pol-1', artifacts_passed_days: 7 },
        presets: {},
      });

      await storageController.getPolicy(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          policy: expect.objectContaining({ id: 'pol-1' }),
        }),
      });
    });
  });

  describe('savePolicy', () => {
    it('saves custom policy and returns updated data', async () => {
      req.body = { artifacts_passed_days: 14, byos_enabled: true };
      storageRetentionService.savePolicy.mockResolvedValue({
        id: 'pol-1',
        artifacts_passed_days: 14,
        byos_enabled: true,
      });

      await storageController.savePolicy(req, res, next);

      expect(storageRetentionService.savePolicy).toHaveBeenCalledWith(null, req.body);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Storage retention policy saved successfully',
        })
      );
    });

    it('returns 400 error on validation failure', async () => {
      storageRetentionService.savePolicy.mockRejectedValue(new Error('Invalid range'));

      await storageController.savePolicy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid range' });
    });
  });

  describe('testByos', () => {
    it('tests BYOS credentials successfully', async () => {
      req.body = { provider: 's3', bucket: 'my-bucket' };
      storageRetentionService.testByosConnection.mockResolvedValue({
        success: true,
        message: 'Connected to S3',
      });

      await storageController.testByos(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Connected to S3',
      });
    });
  });

  describe('runCleanup', () => {
    it('executes cleanup and returns summary metrics', async () => {
      req.body = { dryRun: false };
      storageRetentionService.runRetentionCleanup.mockResolvedValue({
        success: true,
        purgedArtifactsCount: 15,
        freedMegabytes: 45.2,
      });

      await storageController.runCleanup(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ purgedArtifactsCount: 15 }),
        })
      );
    });
  });

  describe('getStats', () => {
    it('returns storage metrics and stats', async () => {
      StoragePolicy.getStorageUsageStats.mockResolvedValue({
        totalArtifacts: 100,
        totalBytes: 52428800,
      });

      await storageController.getStats(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ totalArtifacts: 100 }),
      });
    });
  });
});
