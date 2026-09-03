/**
 * AI Analysis Controller
 * Handles AI diagnostics, provider queries, live model discovery, and connection testing.
 */

import aiAnalysisService from '../../services/aiAnalysisService.js';
import { AiAnalysis } from '../../models/aiAnalysis.js';
import { User } from '../../models/user.js';
import logger from '../../utils/logger.js';

export const getProviders = async (req, res) => {
  try {
    const providers = aiAnalysisService.getSupportedProviders();
    res.json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (error) {
    logger.error('Error fetching AI providers', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve AI providers' });
  }
};

export const fetchModels = async (req, res) => {
  try {
    const { provider, apiKey, customEndpoint } = req.body;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'Provider is required' });
    }

    // If apiKey is not provided in body, try to resolve from authenticated user profile
    let resolvedKey = apiKey;
    let resolvedEndpoint = customEndpoint;
    if (!resolvedKey && req.user?.id) {
      try {
        const user = await User.findById(req.user.id);
        const settings = typeof user?.ai_settings === 'string' ? JSON.parse(user.ai_settings) : user?.ai_settings;
        if (settings?.preferredProvider === provider) {
          resolvedKey = settings.apiKey;
          resolvedEndpoint = resolvedEndpoint || settings.customEndpoint;
        }
      } catch (_) {}
    }

    const models = await aiAnalysisService.fetchLiveModels(provider, resolvedKey, resolvedEndpoint);
    res.json({
      success: true,
      provider,
      count: models.length,
      models,
    });
  } catch (error) {
    logger.error('Error fetching live models', { error: error.message, body: req.body });
    res.status(400).json({ success: false, error: error.message || 'Failed to fetch live models from provider' });
  }
};

export const testConnection = async (req, res) => {
  try {
    const { provider, apiKey, customEndpoint, model } = req.body;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'Provider is required' });
    }

    // Resolve key from user profile if not directly provided
    let resolvedKey = apiKey;
    let resolvedEndpoint = customEndpoint;
    if (!resolvedKey && req.user?.id) {
      try {
        const user = await User.findById(req.user.id);
        const settings = typeof user?.ai_settings === 'string' ? JSON.parse(user.ai_settings) : user?.ai_settings;
        if (settings?.preferredProvider === provider) {
          resolvedKey = settings.apiKey;
          resolvedEndpoint = resolvedEndpoint || settings.customEndpoint;
        }
      } catch (_) {}
    }

    const result = await aiAnalysisService.testConnection(provider, resolvedKey, resolvedEndpoint, model);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    logger.error('Error testing connection', { error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to test connection' });
  }
};

export const getTestAnalysis = async (req, res) => {
  try {
    const { testRunId } = req.params;
    if (!testRunId) {
      return res.status(400).json({ success: false, error: 'testRunId is required' });
    }

    const analysis = await AiAnalysis.findByTestRunId(testRunId);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'No AI analysis found for this test run' });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Error fetching test analysis', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve AI analysis' });
  }
};

export const analyzeTest = async (req, res) => {
  try {
    const { testRunId } = req.params;
    const { forceRegenerate = false, provider, apiKey, model, customEndpoint } = req.body || {};

    if (!testRunId) {
      return res.status(400).json({ success: false, error: 'testRunId is required' });
    }

    // Build user settings priority: Request Body > User Account Settings > Server Default
    let userAiSettings = null;
    if (provider) {
      userAiSettings = { preferredProvider: provider, apiKey, model, customEndpoint };
    } else if (req.user?.id) {
      try {
        const user = await User.findById(req.user.id);
        userAiSettings = typeof user?.ai_settings === 'string' ? JSON.parse(user.ai_settings) : user?.ai_settings;
      } catch (_) {}
    }

    const result = await aiAnalysisService.analyzeTestRun(testRunId, {
      userAiSettings,
      forceRegenerate: Boolean(forceRegenerate),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error analyzing test run', { error: error.message, testRunId: req.params.testRunId });
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to analyze test run' });
  }
};

export const analyzeCluster = async (req, res) => {
  try {
    const { cluster, provider, apiKey, model, customEndpoint } = req.body || {};

    if (!cluster) {
      return res.status(400).json({ success: false, error: 'cluster object is required' });
    }

    let userAiSettings = null;
    if (provider) {
      userAiSettings = { preferredProvider: provider, apiKey, model, customEndpoint };
    } else if (req.user?.id) {
      try {
        const user = await User.findById(req.user.id);
        userAiSettings = typeof user?.ai_settings === 'string' ? JSON.parse(user.ai_settings) : user?.ai_settings;
      } catch (_) {}
    }

    const result = await aiAnalysisService.analyzeCluster(cluster, { userAiSettings });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error analyzing failure cluster', { error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to analyze failure cluster' });
  }
};

export default {
  getProviders,
  fetchModels,
  testConnection,
  getTestAnalysis,
  analyzeTest,
  analyzeCluster,
};
