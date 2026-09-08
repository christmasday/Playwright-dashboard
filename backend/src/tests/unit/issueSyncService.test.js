jest.mock('../../config/env.js', () => ({
  __esModule: true,
  default: {
    FRONTEND_URL: 'http://localhost:5173',
    GITHUB_TOKEN: 'ghp_mock_token_123',
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
  },
  IssueLink: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

import { issueSyncService } from '../../services/issueSyncService.js';
import { IntegrationConfig, IssueLink } from '../../models/issueSync.js';

describe('issueSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const mockTestRun = {
    id: 'tr-100',
    title: 'should submit checkout form',
    name: 'should submit checkout form',
    file: 'e2e/checkout.spec.ts',
    status: 'failed',
    duration: 1850,
    error: 'Timed out 5000ms waiting for expect(locator).toBeVisible()',
    stack_trace: 'Error: Timed out 5000ms\n    at CheckoutPage.submit (checkout.ts:42:12)',
  };

  const mockBuild = {
    id: 'b-500',
    name: 'CI Run #42',
    branch: 'main',
    commit_hash: 'abcdef123456',
    commit_message: 'Refactor checkout component',
    environment: 'staging',
  };

  const mockAiAnalysis = {
    summary: 'The submit button locator changed from .btn-submit to #checkout-submit',
    root_cause_details: 'DOM mutation without matching Playwright test selector update.',
    suggested_fix: {
      code: "await page.locator('#checkout-submit').click();",
      explanation: 'Use the new ID selector instead of the old class.',
    },
  };

  describe('formatGitHubIssueMarkdown', () => {
    it('formats a comprehensive markdown issue description with stack trace and AI insights', () => {
      const markdown = issueSyncService.formatGitHubIssueMarkdown({
        testRun: mockTestRun,
        build: mockBuild,
        aiAnalysis: mockAiAnalysis,
        options: { includeAi: true, includeError: true },
      });

      expect(markdown).toContain('### 🧪 Playwright Test Failure Report');
      expect(markdown).toContain('`e2e/checkout.spec.ts`');
      expect(markdown).toContain('should submit checkout form');
      expect(markdown).toContain('`main`');
      expect(markdown).toContain('### 🧠 AI Root Cause & Fix Suggestions');
      expect(markdown).toContain('The submit button locator changed');
      expect(markdown).toContain('<details>');
      expect(markdown).toContain('Error Stack Trace');
      expect(markdown).toContain('http://localhost:5173/tests/tr-100');
    });

    it('omits AI section when includeAi is false', () => {
      const markdown = issueSyncService.formatGitHubIssueMarkdown({
        testRun: mockTestRun,
        build: mockBuild,
        aiAnalysis: mockAiAnalysis,
        options: { includeAi: false },
      });

      expect(markdown).not.toContain('AI Root Cause & Fix Suggestions');
      expect(markdown).toContain('Error Message');
    });
  });

  describe('formatJiraIssueADF', () => {
    it('formats an Atlassian Document Format (ADF) document tree', () => {
      const adf = issueSyncService.formatJiraIssueADF({
        testRun: mockTestRun,
        build: mockBuild,
        aiAnalysis: mockAiAnalysis,
        options: { includeAi: true, includeError: true },
      });

      expect(adf.type).toBe('doc');
      expect(adf.version).toBe(1);
      expect(Array.isArray(adf.content)).toBe(true);

      const panel = adf.content.find((c) => c.type === 'panel');
      expect(panel).toBeDefined();

      const codeBlocks = adf.content.filter((c) => c.type === 'codeBlock');
      expect(codeBlocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createGitHubIssue', () => {
    it('sends POST request to GitHub API and parses created issue', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1234567,
          number: 42,
          html_url: 'https://github.com/my-org/my-repo/issues/42',
          title: '[Bug] Checkout failure',
          state: 'open',
        }),
      });

      const config = {
        owner: 'my-org',
        repo: 'my-repo',
        token: 'ghp_test_token',
      };

      const result = await issueSyncService.createGitHubIssue(config, {
        title: '[Bug] Checkout failure',
        body: 'Markdown details',
        labels: ['bug', 'playwright'],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/my-org/my-repo/issues',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_test_token',
          }),
        })
      );

      expect(result).toEqual({
        issueId: '1234567',
        issueKey: '#42',
        issueUrl: 'https://github.com/my-org/my-repo/issues/42',
        issueTitle: '[Bug] Checkout failure',
        issueStatus: 'open',
      });
    });

    it('throws on GitHub API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad credentials',
      });

      await expect(
        issueSyncService.createGitHubIssue(
          { owner: 'my-org', repo: 'my-repo', token: 'bad_token' },
          { title: 'Test' }
        )
      ).rejects.toThrow('GitHub API error (401)');
    });
  });

  describe('createJiraIssue', () => {
    it('sends POST request to Jira API and returns key and URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '10042',
          key: 'PW-104',
          self: 'https://my-jira.atlassian.net/rest/api/3/issue/10042',
        }),
      });

      const config = {
        host_url: 'https://my-jira.atlassian.net',
        email: 'dev@example.com',
        api_token: 'jira_api_token_abc',
        project_key: 'PW',
      };

      const result = await issueSyncService.createJiraIssue(config, {
        summary: '[Playwright] Checkout error',
        descriptionADF: { type: 'doc', content: [] },
        issueType: 'Bug',
        priority: 'High',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://my-jira.atlassian.net/rest/api/3/issue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );

      expect(result).toEqual({
        issueId: '10042',
        issueKey: 'PW-104',
        issueUrl: 'https://my-jira.atlassian.net/browse/PW-104',
        issueTitle: '[Playwright] Checkout error',
        issueStatus: 'open',
      });
    });
  });

  describe('testConnection', () => {
    it('validates GitHub repo access', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          full_name: 'my-org/web-app',
          private: true,
          default_branch: 'main',
        }),
      });

      const res = await issueSyncService.testConnection('github', {
        owner: 'my-org',
        repo: 'web-app',
        token: 'ghp_valid',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('my-org/web-app');
    });

    it('validates Jira project access', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '1000',
          key: 'QA',
          name: 'Quality Assurance',
        }),
      });

      const res = await issueSyncService.testConnection('jira', {
        host_url: 'https://test.atlassian.net',
        email: 'qa@test.com',
        api_token: 'token',
        project_key: 'QA',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('Quality Assurance');
    });
  });
});
