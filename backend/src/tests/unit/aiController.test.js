// Mock dependencies
jest.mock('../../services/aiAnalysisService.js', () => ({
  __esModule: true,
  default: {
    getSupportedProviders: jest.fn(),
    fetchLiveModels: jest.fn(),
    testConnection: jest.fn(),
    analyzeTestRun: jest.fn(),
    analyzeCluster: jest.fn(),
  },
}));

jest.mock('../../models/aiAnalysis.js', () => ({
  __esModule: true,
  AiAnalysis: {
    findByTestRunId: jest.fn(),
  },
}));

jest.mock('../../models/user.js', () => ({
  __esModule: true,
  User: {
    findById: jest.fn(),
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

import aiController from '../../api/controllers/aiController.js';
import aiAnalysisService from '../../services/aiAnalysisService.js';
import { AiAnalysis } from '../../models/aiAnalysis.js';

describe('aiController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getProviders', () => {
    it('should return providers list with 200', async () => {
      aiAnalysisService.getSupportedProviders.mockReturnValue([{ id: 'gemini', name: 'Gemini' }]);
      req = {};

      await aiController.getProviders(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 1 })
      );
    });
  });

  describe('fetchModels', () => {
    it('should return 400 if provider is missing', async () => {
      req = { body: {} };
      await aiController.fetchModels(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return models when provider and key are supplied', async () => {
      aiAnalysisService.fetchLiveModels.mockResolvedValue([{ id: 'model-1', name: 'Model 1' }]);
      req = { body: { provider: 'groq', apiKey: 'gsk_test' } };

      await aiController.fetchModels(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 1, models: expect.any(Array) })
      );
    });
  });

  describe('testConnection', () => {
    it('should return 400 if provider is missing', async () => {
      req = { body: {} };
      await aiController.testConnection(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 on successful connection test', async () => {
      aiAnalysisService.testConnection.mockResolvedValue({ success: true, latencyMs: 250 });
      req = { body: { provider: 'gemini', apiKey: 'AIzaSy...' } };

      await aiController.testConnection(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, latencyMs: 250 })
      );
    });
  });

  describe('getTestAnalysis', () => {
    it('should return 404 when no analysis found', async () => {
      AiAnalysis.findByTestRunId.mockResolvedValue(null);
      req = { params: { testRunId: 'tr-999' } };

      await aiController.getTestAnalysis(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 200 with data when analysis exists', async () => {
      AiAnalysis.findByTestRunId.mockResolvedValue({ id: 'a-1', category: 'SELECTOR_DRIFT' });
      req = { params: { testRunId: 'tr-1' } };

      await aiController.getTestAnalysis(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ category: 'SELECTOR_DRIFT' }) })
      );
    });
  });

  describe('analyzeTest', () => {
    it('should return 400 if testRunId is missing', async () => {
      req = { params: {}, body: {} };
      await aiController.analyzeTest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call aiAnalysisService.analyzeTestRun and return 200', async () => {
      aiAnalysisService.analyzeTestRun.mockResolvedValue({ category: 'HYDRATION_RACE' });
      req = { params: { testRunId: 'tr-1' }, body: { forceRegenerate: true } };

      await aiController.analyzeTest(req, res);
      expect(aiAnalysisService.analyzeTestRun).toHaveBeenCalledWith('tr-1', expect.objectContaining({ forceRegenerate: true }));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ category: 'HYDRATION_RACE' }) })
      );
    });
  });
});
