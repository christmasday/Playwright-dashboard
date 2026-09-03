// Mock dependencies
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  TestRun: {
    findById: jest.fn(),
  },
  TestResult: {
    findByTestRunId: jest.fn(),
  },
}));

jest.mock('../../models/aiAnalysis.js', () => ({
  __esModule: true,
  AiAnalysis: {
    create: jest.fn(),
    findByTestRunId: jest.fn(),
    deleteByTestRunId: jest.fn(),
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

import {
  aiAnalysisService,
  analyzeWithHeuristics,
  SUPPORTED_PROVIDERS,
} from '../../services/aiAnalysisService.js';
import { AiAnalysis } from '../../models/aiAnalysis.js';
import { TestRun, TestResult } from '../../models/index.js';

describe('aiAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupportedProviders', () => {
    it('should list all 9 supported providers with preset models', () => {
      const providers = aiAnalysisService.getSupportedProviders();
      expect(providers.length).toBe(9);
      const providerIds = providers.map((p) => p.id);
      expect(providerIds).toContain('gemini');
      expect(providerIds).toContain('openai');
      expect(providerIds).toContain('anthropic');
      expect(providerIds).toContain('groq');
      expect(providerIds).toContain('deepseek');
      expect(providerIds).toContain('mistral');
      expect(providerIds).toContain('openrouter');
      expect(providerIds).toContain('ollama');
      expect(providerIds).toContain('heuristics');
    });
  });

  describe('Deterministic Heuristic Rules Engine', () => {
    it('should accurately classify strict mode locator violation as SELECTOR_DRIFT', () => {
      const context = {
        testTitle: 'login flow',
        errorMessage: 'Error: strict mode violation: locator("button") resolved to 2 elements',
        stackTrace: 'at LoginPage.submit (login.ts:42:10)',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('SELECTOR_DRIFT');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
      expect(result.suggestedFix.afterCode).toContain('getByRole');
    });

    it('should accurately classify locator timeout as SELECTOR_DRIFT', () => {
      const context = {
        testTitle: 'checkout item',
        errorMessage: 'TimeoutError: locator.click: Timeout 30000ms exceeded.\nwaiting for locator("button#pay")',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('SELECTOR_DRIFT');
      expect(result.suggestedFix.afterCode).toContain('toBeVisible');
    });

    it('should accurately classify detached DOM / intercepted clicks as HYDRATION_RACE', () => {
      const context = {
        testTitle: 'update user profile',
        errorMessage: 'Error: Element is detached from the DOM during click',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('HYDRATION_RACE');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it('should accurately classify assertion value mismatches as ASSERTION_REGRESSION', () => {
      const context = {
        testTitle: 'order status check',
        errorMessage: 'Error: expect(received).toEqual(expected)\n\nExpected: "Completed"\nReceived: "Pending"',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('ASSERTION_REGRESSION');
      expect(result.suggestedFix.afterCode).toBeDefined();
    });

    it('should accurately classify 500 server errors as NETWORK_API_500', () => {
      const context = {
        testTitle: 'dashboard data load',
        errorMessage: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('NETWORK_API_500');
      expect(result.suggestedFix.afterCode).toContain('page.route');
    });

    it('should accurately classify test timeout as TIMEOUT_EXCEEDED', () => {
      const context = {
        testTitle: 'heavy report generation',
        errorMessage: 'Test timeout of 30000ms exceeded while executing test hook',
      };
      const result = analyzeWithHeuristics(context);
      expect(result.category).toBe('TIMEOUT_EXCEEDED');
      expect(result.suggestedFix.afterCode).toContain('test.slow');
    });
  });

  describe('analyzeTestRun caching & execution', () => {
    it('should return cached analysis if available and not forceRegenerate', async () => {
      const mockCached = {
        id: 'analysis-1',
        test_run_id: 'tr-1',
        category: 'SELECTOR_DRIFT',
        summary: 'Cached summary',
      };
      AiAnalysis.findByTestRunId.mockResolvedValue(mockCached);

      const result = await aiAnalysisService.analyzeTestRun('tr-1', { forceRegenerate: false });
      expect(result.cached).toBe(true);
      expect(result.summary).toBe('Cached summary');
      expect(TestRun.findById).not.toHaveBeenCalled();
    });

    it('should analyze and persist when no cache exists', async () => {
      AiAnalysis.findByTestRunId.mockResolvedValue(null);
      TestRun.findById.mockResolvedValue({
        id: 'tr-1',
        title: 'failed login',
        file: 'auth.spec.ts',
        error: 'TimeoutError: waiting for locator(".btn-login")',
      });
      TestResult.findByTestRunId.mockResolvedValue([]);
      AiAnalysis.create.mockImplementation((data) => Promise.resolve({ id: 'new-1', ...data }));

      const result = await aiAnalysisService.analyzeTestRun('tr-1', {
        userAiSettings: { preferredProvider: 'heuristics' },
      });

      expect(result.category).toBe('SELECTOR_DRIFT');
      expect(result.cached).toBe(false);
      expect(AiAnalysis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          testRunId: 'tr-1',
          category: 'SELECTOR_DRIFT',
        })
      );
    });
  });

  describe('testConnection', () => {
    it('should succeed instantly for built-in heuristics', async () => {
      const res = await aiAnalysisService.testConnection('heuristics', null);
      expect(res.success).toBe(true);
      expect(res.latencyMs).toBeLessThan(50);
    });

    it('should fail if apiKey is missing for non-ollama provider', async () => {
      const res = await aiAnalysisService.testConnection('gemini', null);
      expect(res.success).toBe(false);
      expect(res.error).toContain('API key is required');
    });
  });
});
