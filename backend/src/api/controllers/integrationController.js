/**
 * Integration Controller
 * Handles Jira & GitHub configuration, connection tests, and 1-click issue creation/sync.
 */

import { IntegrationConfig, IssueLink } from '../../models/issueSync.js';
import { TestRun, Build } from '../../models/index.js';
import { queryOne } from '../../config/database.js';
import issueSyncService from '../../services/issueSyncService.js';
import logger from '../../utils/logger.js';

const maskToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  if (token.length <= 8) return '••••••••';
  return `${token.substring(0, 4)}••••••••${token.slice(-4)}`;
};

export const getIntegrationConfigs = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const configs = await IntegrationConfig.list(projectId || null);

    // Mask sensitive tokens in response
    const masked = configs.map((c) => {
      const cfg = { ...(c.config || {}) };
      if (cfg.token) cfg.token = maskToken(cfg.token);
      if (cfg.api_token) cfg.api_token = maskToken(cfg.api_token);
      if (cfg.apiToken) cfg.apiToken = maskToken(cfg.apiToken);
      return {
        ...c,
        config: cfg,
      };
    });

    res.json({
      success: true,
      data: masked,
    });
  } catch (error) {
    logger.error('Error fetching integration configs', { error: error.message });
    next(error);
  }
};

export const saveIntegrationConfig = async (req, res, next) => {
  try {
    const { projectId = null, provider, config, enabled = true } = req.body;

    if (!provider || !['github', 'jira'].includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Provider must be "github" or "jira"' });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Config object is required' });
    }

    // Preserve existing token if user sent masked token
    const existing = await IntegrationConfig.get(projectId, provider.toLowerCase());
    const existingConfig = existing?.config || {};

    const cleanConfig = { ...config };
    if (provider.toLowerCase() === 'github') {
      if (cleanConfig.token && cleanConfig.token.includes('••••')) {
        cleanConfig.token = existingConfig.token;
      }
    } else if (provider.toLowerCase() === 'jira') {
      const tokenKey = cleanConfig.api_token ? 'api_token' : 'apiToken';
      if (cleanConfig[tokenKey] && cleanConfig[tokenKey].includes('••••')) {
        cleanConfig[tokenKey] = existingConfig.api_token || existingConfig.apiToken;
      }
    }

    const saved = await IntegrationConfig.save({
      projectId: projectId || null,
      provider: provider.toLowerCase(),
      config: cleanConfig,
      enabled: Boolean(enabled),
      createdBy: req.user?.id || null,
    });

    const responseConfig = { ...(saved.config || {}) };
    if (responseConfig.token) responseConfig.token = maskToken(responseConfig.token);
    if (responseConfig.api_token) responseConfig.api_token = maskToken(responseConfig.api_token);
    if (responseConfig.apiToken) responseConfig.apiToken = maskToken(responseConfig.apiToken);

    res.json({
      success: true,
      message: `${provider.toUpperCase()} integration configuration saved successfully`,
      data: {
        ...saved,
        config: responseConfig,
      },
    });
  } catch (error) {
    logger.error('Error saving integration config', { error: error.message });
    next(error);
  }
};

export const testIntegrationConnection = async (req, res, next) => {
  try {
    const { provider, config, projectId } = req.body;

    if (!provider || !['github', 'jira'].includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Provider must be "github" or "jira"' });
    }

    let effectiveConfig = config;

    // If config was not fully supplied in request, pull existing
    if (!effectiveConfig || Object.keys(effectiveConfig).length === 0) {
      const existing = await IntegrationConfig.get(projectId || null, provider.toLowerCase());
      effectiveConfig = existing?.config;
    } else {
      // If token is masked, retrieve real token from DB
      const existing = await IntegrationConfig.get(projectId || null, provider.toLowerCase());
      const existingConfig = existing?.config || {};
      if (provider.toLowerCase() === 'github' && effectiveConfig.token?.includes('••••')) {
        effectiveConfig.token = existingConfig.token;
      } else if (provider.toLowerCase() === 'jira') {
        const tokenKey = effectiveConfig.api_token ? 'api_token' : 'apiToken';
        if (effectiveConfig[tokenKey]?.includes('••••')) {
          effectiveConfig[tokenKey] = existingConfig.api_token || existingConfig.apiToken;
        }
      }
    }

    if (!effectiveConfig) {
      return res.status(400).json({ error: 'No configuration found to test' });
    }

    const result = await issueSyncService.testConnection(provider.toLowerCase(), effectiveConfig);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error testing integration connection', { error: error.message });
    next(error);
  }
};

export const createIssueFromTest = async (req, res, next) => {
  try {
    const {
      testRunId,
      provider,
      title,
      description,
      priority,
      issueType,
      labels,
      includeAi = true,
      includeError = true,
    } = req.body;

    if (!testRunId) {
      return res.status(400).json({ error: 'testRunId is required' });
    }

    if (!provider || !['github', 'jira'].includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Provider must be "github" or "jira"' });
    }

    // 1. Fetch test run details
    const testRun = await TestRun.findById(testRunId);
    if (!testRun) {
      return res.status(404).json({ error: `Test run ${testRunId} not found` });
    }

    // 2. Fetch build details
    let build = null;
    if (testRun.build_id) {
      build = await Build.findById(testRun.build_id);
    }

    // 3. Fetch AI root cause analysis if available
    let aiAnalysis = null;
    if (includeAi) {
      aiAnalysis = await queryOne(
        `SELECT * FROM test_ai_analyses WHERE test_run_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [testRunId]
      );
    }

    // 4. Resolve integration config (Project-specific or Global)
    const configRecord = await IntegrationConfig.get(build?.project_id || null, provider.toLowerCase());
    if (!configRecord || !configRecord.config) {
      return res.status(400).json({
        error: `No active ${provider.toUpperCase()} integration configured. Please configure it in Settings > Integrations first.`,
      });
    }

    const config = configRecord.config;
    let createdIssue;

    if (provider.toLowerCase() === 'github') {
      const issueTitle = title || `[Playwright Failure] ${testRun.title || testRun.name} in ${testRun.file || 'test'}`;
      const issueBody = description || issueSyncService.formatGitHubIssueMarkdown({
        testRun,
        build,
        aiAnalysis,
        options: { includeAi, includeError },
      });

      createdIssue = await issueSyncService.createGitHubIssue(config, {
        title: issueTitle,
        body: issueBody,
        labels: labels || config.default_labels || ['bug', 'playwright'],
      });
    } else if (provider.toLowerCase() === 'jira') {
      const issueSummary = title || `[Playwright] ${testRun.title || testRun.name} failed in ${testRun.file || 'test'}`;
      const descriptionADF = issueSyncService.formatJiraIssueADF({
        testRun,
        build,
        aiAnalysis,
        options: { includeAi, includeError },
      });

      createdIssue = await issueSyncService.createJiraIssue(config, {
        summary: issueSummary,
        descriptionADF,
        issueType: issueType || config.issue_type || config.issueType || 'Bug',
        priority: priority || config.default_priority || config.defaultPriority || 'High',
        labels: labels || config.default_labels || ['playwright'],
      });
    }

    // 5. Store mapping in issue_links table
    const issueLink = await IssueLink.create({
      projectId: build?.project_id || null,
      testRunId: testRun.id,
      testName: testRun.title || testRun.name,
      testFile: testRun.file || null,
      provider: provider.toLowerCase(),
      issueId: createdIssue.issueId,
      issueKey: createdIssue.issueKey,
      issueUrl: createdIssue.issueUrl,
      issueTitle: createdIssue.issueTitle,
      issueStatus: createdIssue.issueStatus,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: `Issue ${createdIssue.issueKey} created successfully in ${provider.toUpperCase()}`,
      data: issueLink,
    });
  } catch (error) {
    logger.error('Error creating issue from test run', { error: error.message });
    next(error);
  }
};

export const getLinkedIssues = async (req, res, next) => {
  try {
    const { testRunId, testName, projectId } = req.query;

    let issues = [];
    if (testRunId) {
      issues = await IssueLink.findByTestRunId(testRunId);
      // If no issues directly on this run, check by test name across previous runs
      if (issues.length === 0 && testName) {
        issues = await IssueLink.findByTestName(testName, projectId || null);
      }
    } else if (testName) {
      issues = await IssueLink.findByTestName(testName, projectId || null);
    } else {
      issues = await IssueLink.list({ projectId: projectId || null, limit: 50 });
    }

    res.json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    logger.error('Error getting linked issues', { error: error.message });
    next(error);
  }
};

export const syncIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await issueSyncService.syncIssueStatus(id);

    res.json({
      success: true,
      message: `Status updated to "${updated.issue_status}"`,
      data: updated,
    });
  } catch (error) {
    logger.error('Error syncing issue status', { id: req.params.id, error: error.message });
    next(error);
  }
};

export const unlinkIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await IssueLink.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Issue link not found' });
    }

    res.json({
      success: true,
      message: 'Issue unlinked successfully',
      data: deleted,
    });
  } catch (error) {
    logger.error('Error unlinking issue', { id: req.params.id, error: error.message });
    next(error);
  }
};

export default {
  getIntegrationConfigs,
  saveIntegrationConfig,
  testIntegrationConnection,
  createIssueFromTest,
  getLinkedIssues,
  syncIssue,
  unlinkIssue,
};
