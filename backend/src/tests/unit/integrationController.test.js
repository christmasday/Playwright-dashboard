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

jest.mock('../../models/issueSync.js', () => ({
  __esModule: true,
  IntegrationConfig: {
    get: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
  },
  IssueLink: {
    create: jest.fn(),
    findById: jest.fn(),
    findByTestRunId: jest.fn(),
    findByTestName: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../models/index.js', () => ({
  __esModule: true,
  TestRun: {
    findById: jest.fn(),
  },
  Build: {
    findById: jest.fn(),
  },
}));

jest.mock('../../config/database.js', () => ({
  __esModule: true,
  queryOne: jest.fn(),
  query: jest.fn(),
}));

jest.mock('../../services/issueSyncService.js', () => ({
  __esModule: true,
  default: {
    formatGitHubIssueMarkdown: jest.fn().mockReturnValue('Formatted markdown'),
    formatJiraIssueADF: jest.fn().mockReturnValue({ type: 'doc', content: [] }),
    createGitHubIssue: jest.fn(),
    createJiraIssue: jest.fn(),
    syncIssueStatus: jest.fn(),
    testConnection: jest.fn(),
  },
}));

import integrationController from '../../api/controllers/integrationController.js';
import { IntegrationConfig, IssueLink } from '../../models/issueSync.js';
import { TestRun } from '../../models/index.js';
import issueSyncService from '../../services/issueSyncService.js';

describe('Integration Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('getIntegrationConfigs', () => {
    it('returns masked tokens in response', async () => {
      IntegrationConfig.list.mockResolvedValue([
        {
          id: 'cfg-1',
          provider: 'github',
          config: { owner: 'my-org', repo: 'web', token: 'ghp_secret_token_12345678' },
        },
      ]);

      await integrationController.getIntegrationConfigs(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              provider: 'github',
              config: expect.objectContaining({
                token: 'ghp_••••••••5678',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('saveIntegrationConfig', () => {
    it('saves clean configuration', async () => {
      req.body = {
        provider: 'github',
        config: { owner: 'my-org', repo: 'app', token: 'ghp_fresh_token' },
      };
      IntegrationConfig.get.mockResolvedValue(null);
      IntegrationConfig.save.mockResolvedValue({
        id: 'cfg-saved',
        provider: 'github',
        config: req.body.config,
      });

      await integrationController.saveIntegrationConfig(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('GITHUB'),
        })
      );
    });

    it('rejects invalid provider', async () => {
      req.body = { provider: 'unknown', config: {} };
      await integrationController.saveIntegrationConfig(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createIssueFromTest', () => {
    it('creates GitHub issue and persists issue link', async () => {
      req.body = {
        testRunId: 'tr-1',
        provider: 'github',
      };

      TestRun.findById.mockResolvedValue({
        id: 'tr-1',
        title: 'Login fails',
        file: 'login.spec.ts',
        build_id: 'b-1',
      });

      IntegrationConfig.get.mockResolvedValue({
        provider: 'github',
        config: { owner: 'org', repo: 'repo', token: 'token' },
      });

      issueSyncService.createGitHubIssue.mockResolvedValue({
        issueId: '101',
        issueKey: '#55',
        issueUrl: 'https://github.com/org/repo/issues/55',
        issueTitle: '[Playwright Failure] Login fails',
        issueStatus: 'open',
      });

      IssueLink.create.mockResolvedValue({
        id: 'link-1',
        issueKey: '#55',
        provider: 'github',
      });

      await integrationController.createIssueFromTest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('#55'),
        })
      );
    });
  });

  describe('syncIssue', () => {
    it('syncs status from provider', async () => {
      req.params.id = 'link-1';
      issueSyncService.syncIssueStatus.mockResolvedValue({
        id: 'link-1',
        issue_status: 'closed',
      });

      await integrationController.syncIssue(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Status updated to "closed"',
        })
      );
    });
  });
});
