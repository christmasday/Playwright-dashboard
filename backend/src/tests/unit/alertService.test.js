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

jest.mock('../../models/alertDestination.js', () => ({
  __esModule: true,
  AlertDestination: {
    createDeliveryLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
    list: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../models/index.js', () => ({
  __esModule: true,
  Build: {
    findById: jest.fn(),
  },
  TestRun: {
    findByBuildId: jest.fn(),
  },
}));

jest.mock('../../config/database.js', () => ({
  __esModule: true,
  queryOne: jest.fn(),
  query: jest.fn(),
}));

import { alertService } from '../../services/alertService.js';

describe('Alert Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('matchesBranch', () => {
    it('should match any branch if pattern is * or empty', () => {
      expect(alertService.matchesBranch('main', '*')).toBe(true);
      expect(alertService.matchesBranch('feature/auth', '')).toBe(true);
      expect(alertService.matchesBranch('dev', null)).toBe(true);
    });

    it('should match exact branch name', () => {
      expect(alertService.matchesBranch('main', 'main')).toBe(true);
      expect(alertService.matchesBranch('develop', 'main')).toBe(false);
    });

    it('should match comma-separated branches', () => {
      expect(alertService.matchesBranch('main', 'main, staging, release')).toBe(true);
      expect(alertService.matchesBranch('staging', 'main, staging, release')).toBe(true);
      expect(alertService.matchesBranch('dev', 'main, staging, release')).toBe(false);
    });

    it('should match wildcard prefix', () => {
      expect(alertService.matchesBranch('release/1.0', 'release/*')).toBe(true);
      expect(alertService.matchesBranch('feature/test', 'release/*')).toBe(false);
    });
  });

  describe('shouldTriggerEvent', () => {
    it('should always trigger for "all"', () => {
      expect(alertService.shouldTriggerEvent('all', 'passed', { failed: 0 }, 'passed')).toBe(true);
      expect(alertService.shouldTriggerEvent('all', 'failed', { failed: 2 }, 'passed')).toBe(true);
    });

    it('should trigger for "failures_only" when tests failed', () => {
      expect(alertService.shouldTriggerEvent('failures_only', 'failed', { failed: 1 }, 'passed')).toBe(true);
      expect(alertService.shouldTriggerEvent('failures_only', 'passed', { failed: 0 }, 'passed')).toBe(false);
    });

    it('should trigger for "status_change" when status flips', () => {
      // Regressed (passed -> failed)
      expect(alertService.shouldTriggerEvent('status_change', 'failed', { failed: 1 }, 'passed')).toBe(true);
      // Recovered / Fixed (failed -> passed)
      expect(alertService.shouldTriggerEvent('status_change', 'passed', { failed: 0 }, 'failed')).toBe(true);
      // Remained same
      expect(alertService.shouldTriggerEvent('status_change', 'passed', { failed: 0 }, 'passed')).toBe(false);
      expect(alertService.shouldTriggerEvent('status_change', 'failed', { failed: 1 }, 'failed')).toBe(false);
    });
  });

  describe('formatSlackPayload', () => {
    const mockBuild = {
      id: 'b-123',
      name: 'CI Suite',
      branch: 'main',
      commit_hash: 'abcdef123456',
      commit_message: 'Add checkout tests',
      environment: 'ci',
      status: 'failed',
    };
    const mockStats = { total: 10, passed: 8, failed: 2, flaky: 1, skipped: 0, totalDuration: 65000 };
    const mockProject = { name: 'E-Commerce App' };

    it('generates Block Kit message for failed build', () => {
      const options = {
        failedTests: [{ title: 'Login fails', file: 'login.spec.ts', error: 'Timeout 30000ms' }],
        aiSummary: 'Selector changed on login submit button',
        includeAiSummary: true,
      };

      const payload = alertService.formatSlackPayload(mockBuild, mockStats, mockProject, options);
      expect(payload.text).toContain('FAILED');
      expect(payload.blocks.length).toBeGreaterThanOrEqual(4);
      expect(payload.blocks[0].text.text).toContain('Playwright Build FAILED');
      expect(payload.blocks[1].fields[0].text).toContain('main');
      // Action button
      const actionsBlock = payload.blocks.find((b) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements[0].url).toContain('/builds/b-123');
    });

    it('generates Block Kit message for passed build', () => {
      const passedBuild = { ...mockBuild, status: 'passed' };
      const passedStats = { ...mockStats, failed: 0, flaky: 0 };
      const payload = alertService.formatSlackPayload(passedBuild, passedStats, mockProject);
      expect(payload.text).toContain('PASSED');
      expect(payload.blocks[0].text.text).toContain('🟢');
    });
  });

  describe('formatTeamsPayload', () => {
    const mockBuild = {
      id: 'b-456',
      name: 'Smoke Tests',
      branch: 'develop',
      commit_hash: '1234567',
      commit_message: 'Update dependencies',
      environment: 'staging',
      status: 'passed',
    };
    const mockStats = { total: 5, passed: 5, failed: 0, flaky: 0, skipped: 0, totalDuration: 12000 };
    const mockProject = { name: 'API Service' };

    it('generates MessageCard with facts and action', () => {
      const payload = alertService.formatTeamsPayload(mockBuild, mockStats, mockProject);
      expect(payload['@type']).toBe('MessageCard');
      expect(payload.themeColor).toBe('22C55E'); // Green for passed
      expect(payload.sections[0].facts).toHaveLength(6);
      expect(payload.potentialAction[0].targets[0].uri).toContain('/builds/b-456');
    });

    it('sets red theme color on failure', () => {
      const failedBuild = { ...mockBuild, status: 'failed' };
      const failedStats = { ...mockStats, failed: 1 };
      const payload = alertService.formatTeamsPayload(failedBuild, failedStats, mockProject, {
        failedTests: [{ title: 'GET /users fails' }],
      });
      expect(payload.themeColor).toBe('EF4444');
    });
  });

  describe('formatDiscordPayload', () => {
    const mockBuild = {
      id: 'b-789',
      name: 'Nightly Run',
      branch: 'main',
      commit_hash: 'fedcba9',
      commit_message: 'Nightly regression pass',
      environment: 'prod',
      status: 'passed',
    };
    const mockStats = { total: 20, passed: 19, failed: 0, flaky: 1, skipped: 0, totalDuration: 90000 };

    it('generates Discord embed with color and fields', () => {
      const payload = alertService.formatDiscordPayload(mockBuild, mockStats, { name: 'Web App' });
      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];
      expect(embed.color).toBe(0xf59e0b); // Amber for flaky
      expect(embed.fields.some((f) => f.name === 'Branch')).toBe(true);
      expect(embed.fields.some((f) => f.name === 'Flaky')).toBe(true);
    });
  });

  describe('generateTestPayload', () => {
    it('returns valid test payloads for slack, teams, and discord', () => {
      const slack = alertService.generateTestPayload('slack');
      expect(slack.blocks).toBeDefined();

      const teams = alertService.generateTestPayload('teams');
      expect(teams['@type']).toBe('MessageCard');

      const discord = alertService.generateTestPayload('discord');
      expect(discord.embeds).toBeDefined();
    });
  });
});
