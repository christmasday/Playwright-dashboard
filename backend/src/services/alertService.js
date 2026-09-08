/**
 * Alert Service
 * Formats and delivers notifications to Slack, Microsoft Teams, and Discord webhooks.
 */

import { AlertDestination } from '../models/alertDestination.js';
import { Build, TestRun } from '../models/index.js';
import { queryOne } from '../config/database.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export const alertService = {
  /**
   * Evaluates whether a branch matches a branch pattern (e.g. "*", "main", "main,release/*")
   */
  matchesBranch: (branch, branchPattern) => {
    if (!branchPattern || branchPattern.trim() === '' || branchPattern.trim() === '*') {
      return true;
    }
    if (!branch) return false;

    const patterns = branchPattern.split(',').map((p) => p.trim());
    return patterns.some((pat) => {
      if (pat === '*' || pat === branch) return true;
      if (pat.endsWith('*')) {
        const prefix = pat.slice(0, -1);
        return branch.startsWith(prefix);
      }
      return false;
    });
  },

  /**
   * Evaluates whether an event trigger should fire based on build stats and previous build status
   */
  shouldTriggerEvent: (eventRule, currentStatus, stats, previousStatus) => {
    const isFailure = currentStatus === 'failed' || (stats && stats.failed > 0);

    if (eventRule === 'all') {
      return true;
    }
    if (eventRule === 'failures_only') {
      return isFailure;
    }
    if (eventRule === 'status_change') {
      if (!previousStatus) return isFailure;
      const prevWasFailure = previousStatus === 'failed';
      // Trigger if it broke (pass -> fail) or if it was fixed (fail -> pass)
      return prevWasFailure !== isFailure;
    }

    return isFailure;
  },

  /**
   * Formats duration in milliseconds to human readable string (e.g. "1m 42s" or "450ms")
   */
  formatDuration: (ms) => {
    if (!ms || ms <= 0) return '0s';
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 1) return `${ms}ms`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  },

  /**
   * Format Slack Block Kit Payload
   */
  formatSlackPayload: (build, stats, project, options = {}) => {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const buildUrl = `${frontendUrl}/builds/${build.id}`;
    const projectName = project?.name || build.projectName || 'Playwright Project';
    const isPassed = build.status === 'passed' && (stats?.failed || 0) === 0;
    const isFailed = build.status === 'failed' || (stats?.failed || 0) > 0;
    const isFlaky = (stats?.flaky || 0) > 0;

    const statusEmoji = isFailed ? '🔴' : isFlaky ? '🟡' : '🟢';
    const statusText = isFailed ? 'FAILED' : isFlaky ? 'PASSED WITH FLAKY' : 'PASSED';

    const commitShort = build.commit_hash || build.commitHash
      ? (build.commit_hash || build.commitHash).substring(0, 7)
      : 'N/A';
    const branch = build.branch || 'main';
    const duration = alertService.formatDuration(stats?.duration || stats?.totalDuration || 0);

    const fallbackText = `${statusEmoji} [${statusText}] ${projectName} - Build #${build.name || build.id?.substring(0, 8)} (${branch})`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Playwright Build ${statusText}: ${projectName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Branch:*\n\`${branch}\`` },
          { type: 'mrkdwn', text: `*Commit:*\n\`${commitShort}\` ${build.commit_message || build.commitMessage || ''}`.trim() },
          { type: 'mrkdwn', text: `*Environment:*\n${build.environment || 'ci'}` },
          { type: 'mrkdwn', text: `*Duration:*\n${duration}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Test Results:*  ✅ *${stats?.passed || 0}* Passed  |  ❌ *${stats?.failed || 0}* Failed  |  ⚠️ *${stats?.flaky || 0}* Flaky  |  ⏭️ *${stats?.skipped || 0}* Skipped  (Total: *${stats?.total || 0}*)`,
        },
      },
    ];

    // Add top failed test details if failures occurred
    if (options.failedTests && options.failedTests.length > 0) {
      const failureLines = options.failedTests.slice(0, 5).map((t) => {
        const title = t.title || t.name;
        const err = t.error ? ` - _${t.error.substring(0, 90).replace(/\n/g, ' ')}_` : '';
        return `• *${title}* (${t.file || 'test'})${err}`;
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failed Tests Breakdown:*\n${failureLines.join('\n')}${options.failedTests.length > 5 ? `\n_...and ${options.failedTests.length - 5} more failure(s)_` : ''}`,
        },
      });
    }

    // Add AI Root Cause summary if available and enabled
    if (options.aiSummary && options.includeAiSummary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🧠 *AI Root Cause Diagnosis:*\n>${options.aiSummary.replace(/\n/g, '\n>')}`,
        },
      });
    }

    // Action button to view build in dashboard
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Build Details ↗',
            emoji: true,
          },
          url: buildUrl,
          style: isFailed ? 'danger' : 'primary',
        },
      ],
    });

    return {
      text: fallbackText,
      blocks,
    };
  },

  /**
   * Format Microsoft Teams MessageCard Payload
   */
  formatTeamsPayload: (build, stats, project, options = {}) => {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const buildUrl = `${frontendUrl}/builds/${build.id}`;
    const projectName = project?.name || build.projectName || 'Playwright Project';
    const isPassed = build.status === 'passed' && (stats?.failed || 0) === 0;
    const isFailed = build.status === 'failed' || (stats?.failed || 0) > 0;
    const isFlaky = (stats?.flaky || 0) > 0;

    const themeColor = isFailed ? 'EF4444' : isFlaky ? 'F59E0B' : '22C55E';
    const statusEmoji = isFailed ? '🔴' : isFlaky ? '🟡' : '🟢';
    const statusText = isFailed ? 'FAILED' : isFlaky ? 'PASSED WITH FLAKY' : 'PASSED';

    const commitShort = build.commit_hash || build.commitHash
      ? (build.commit_hash || build.commitHash).substring(0, 7)
      : 'N/A';
    const branch = build.branch || 'main';
    const duration = alertService.formatDuration(stats?.duration || stats?.totalDuration || 0);

    const facts = [
      { name: 'Status', value: `${statusEmoji} ${statusText}` },
      { name: 'Branch', value: branch },
      { name: 'Commit', value: `${commitShort} - ${build.commit_message || build.commitMessage || 'N/A'}` },
      { name: 'Environment', value: build.environment || 'ci' },
      { name: 'Duration', value: duration },
      { name: 'Test Breakdown', value: `✅ ${stats?.passed || 0} Passed  |  ❌ ${stats?.failed || 0} Failed  |  ⚠️ ${stats?.flaky || 0} Flaky` },
    ];

    let failureSectionText = '';
    if (options.failedTests && options.failedTests.length > 0) {
      const topFailures = options.failedTests.slice(0, 4).map((t) => `* **${t.title || t.name}** (${t.file || 'test'})`);
      failureSectionText += `\n\n**Failed Tests:**\n\n${topFailures.join('\n\n')}`;
    }

    if (options.aiSummary && options.includeAiSummary) {
      failureSectionText += `\n\n**🧠 AI Root Cause Summary:**\n\n${options.aiSummary}`;
    }

    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: `Playwright Build ${statusText}: ${projectName}`,
      title: `${statusEmoji} Playwright Build ${statusText}: ${projectName}`,
      sections: [
        {
          activityTitle: `Build #${build.name || build.id?.substring(0, 8)}`,
          facts,
          text: failureSectionText.trim() || undefined,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenURI',
          name: 'View Build in Dashboard',
          targets: [{ os: 'default', uri: buildUrl }],
        },
      ],
    };
  },

  /**
   * Format Discord Webhook Embed Payload
   */
  formatDiscordPayload: (build, stats, project, options = {}) => {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const buildUrl = `${frontendUrl}/builds/${build.id}`;
    const projectName = project?.name || build.projectName || 'Playwright Project';
    const isPassed = build.status === 'passed' && (stats?.failed || 0) === 0;
    const isFailed = build.status === 'failed' || (stats?.failed || 0) > 0;
    const isFlaky = (stats?.flaky || 0) > 0;

    // Discord embed colors: decimal numbers
    const color = isFailed ? 0xef4444 : isFlaky ? 0xf59e0b : 0x22c55e;
    const statusEmoji = isFailed ? '🔴' : isFlaky ? '🟡' : '🟢';
    const statusText = isFailed ? 'FAILED' : isFlaky ? 'PASSED WITH FLAKY' : 'PASSED';

    const commitShort = build.commit_hash || build.commitHash
      ? (build.commit_hash || build.commitHash).substring(0, 7)
      : 'N/A';
    const branch = build.branch || 'main';
    const duration = alertService.formatDuration(stats?.duration || stats?.totalDuration || 0);

    const fields = [
      { name: 'Branch', value: `\`${branch}\``, inline: true },
      { name: 'Commit', value: `\`${commitShort}\``, inline: true },
      { name: 'Duration', value: duration, inline: true },
      { name: 'Environment', value: build.environment || 'ci', inline: true },
      { name: 'Passed', value: `✅ ${stats?.passed || 0}`, inline: true },
      { name: 'Failed', value: `❌ ${stats?.failed || 0}`, inline: true },
    ];

    if (stats?.flaky > 0) {
      fields.push({ name: 'Flaky', value: `⚠️ ${stats.flaky}`, inline: true });
    }

    if (options.failedTests && options.failedTests.length > 0) {
      const topFailures = options.failedTests.slice(0, 4).map((t) => {
        const err = t.error ? `\n> \`${t.error.substring(0, 80).replace(/\n/g, ' ')}\`` : '';
        return `• **${t.title || t.name}** (${t.file || 'test'})${err}`;
      });
      fields.push({
        name: 'Top Failures',
        value: topFailures.join('\n'),
        inline: false,
      });
    }

    if (options.aiSummary && options.includeAiSummary) {
      fields.push({
        name: '🧠 AI Root Cause Diagnosis',
        value: options.aiSummary.length > 300 ? `${options.aiSummary.substring(0, 300)}...` : options.aiSummary,
        inline: false,
      });
    }

    return {
      username: 'Playwright Dashboard',
      avatar_url: 'https://playwright.dev/img/playwright-logo.svg',
      embeds: [
        {
          title: `${statusEmoji} Build ${statusText}: ${projectName}`,
          url: buildUrl,
          description: `Build **#${build.name || build.id?.substring(0, 8)}** completed on branch **${branch}**\nCommit: ${build.commit_message || build.commitMessage || 'N/A'}`,
          color,
          fields,
          footer: {
            text: 'Playwright Dashboard Alerts',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  },

  /**
   * Dispatches payload to external webhook URL with a timeout
   */
  sendWebhookPayload: async (provider, webhookUrl, payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    const startTime = Date.now();

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Playwright-Dashboard-Alerts/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          statusCode: res.status,
          latencyMs,
          error: `Webhook returned HTTP ${res.status}: ${errorText || res.statusText}`,
        };
      }

      return {
        success: true,
        statusCode: res.status,
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        statusCode: isTimeout ? 408 : 500,
        latencyMs,
        error: isTimeout ? 'Webhook request timed out after 8s' : err.message,
      };
    }
  },

  /**
   * Generates a test notification payload for Slack, Teams, or Discord
   */
  generateTestPayload: (provider) => {
    const mockBuild = {
      id: 'test-build-12345678',
      name: 'Smoke & Regression Suite',
      branch: 'main',
      commit_hash: 'c8f12a9',
      commit_message: 'Verify webhook notification channel connectivity',
      environment: 'staging',
      status: 'passed',
    };

    const mockStats = {
      total: 36,
      passed: 34,
      failed: 0,
      flaky: 2,
      skipped: 0,
      totalDuration: 42300,
    };

    const mockProject = {
      name: 'Playwright Dashboard Sample Project',
    };

    const options = {
      includeAiSummary: true,
      aiSummary: 'Test notification verified. Webhook connectivity is active and ready to broadcast test results.',
    };

    switch (provider) {
      case 'slack':
        return alertService.formatSlackPayload(mockBuild, mockStats, mockProject, options);
      case 'teams':
        return alertService.formatTeamsPayload(mockBuild, mockStats, mockProject, options);
      case 'discord':
        return alertService.formatDiscordPayload(mockBuild, mockStats, mockProject, options);
      default:
        return alertService.formatSlackPayload(mockBuild, mockStats, mockProject, options);
    }
  },

  /**
   * Sends a test alert directly to a webhook URL and records a delivery log
   */
  sendTestAlert: async ({ provider, webhookUrl, destinationId = null }) => {
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    const payload = alertService.generateTestPayload(provider);
    const result = await alertService.sendWebhookPayload(provider, webhookUrl, payload);

    try {
      if (destinationId) {
        await AlertDestination.createDeliveryLog({
          alertDestinationId: destinationId,
          provider,
          status: result.success ? 'success' : 'failed',
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
          errorMessage: result.error || null,
          payload,
        });
      }
    } catch (logErr) {
      logger.warn('Failed to record test alert delivery log', { error: logErr.message });
    }

    return result;
  },

  /**
   * Dispatches alerts for a completed build across all matching destinations
   */
  dispatchBuildAlerts: async (buildId) => {
    try {
      // 1. Fetch Build
      const build = await Build.findById(buildId);
      if (!build) {
        logger.warn(`Cannot dispatch alerts: Build ${buildId} not found`);
        return [];
      }

      // 2. Fetch project details
      let project = null;
      if (build.project_id) {
        project = await queryOne('SELECT id, name FROM projects WHERE id = $1', [build.project_id]);
      }

      // 3. Fetch test runs and calculate statistics
      const testRuns = await TestRun.findByBuildId(buildId);
      const passedCount = testRuns.filter((t) => t.status === 'passed').length;
      const failedCount = testRuns.filter((t) => t.status === 'failed').length;
      const flakyCount = testRuns.filter((t) => (t.retries || 0) > 0 && t.status === 'passed').length;
      const skippedCount = testRuns.filter((t) => t.status === 'skipped').length;
      const totalDuration = testRuns.reduce((acc, t) => acc + (t.duration || 0), 0);

      const stats = {
        total: testRuns.length,
        passed: passedCount,
        failed: failedCount,
        flaky: flakyCount,
        skipped: skippedCount,
        totalDuration,
      };

      // 4. Extract failed tests for failure highlights
      const failedTests = testRuns
        .filter((t) => t.status === 'failed')
        .map((t) => ({
          title: t.title || t.name,
          file: t.file,
          error: t.error || null,
        }));

      // 5. Fetch previous build status on same branch/project to check status transitions
      let previousStatus = null;
      if (build.branch) {
        const prevSql = `
          SELECT status FROM builds
          WHERE project_id IS NOT DISTINCT FROM $1
            AND branch = $2
            AND id != $3
            AND created_at < $4
            AND status IN ('passed', 'failed')
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const prevRow = await queryOne(prevSql, [build.project_id || null, build.branch, build.id, build.created_at || new Date()]);
        if (prevRow) {
          previousStatus = prevRow.status;
        }
      }

      // 6. Fetch AI analysis if available for any failed test in this build
      let aiSummary = null;
      if (failedCount > 0) {
        try {
          const aiRow = await queryOne(
            `SELECT summary FROM test_ai_analyses taa
             JOIN test_runs tr ON taa.test_run_id = tr.id
             WHERE tr.build_id = $1
             ORDER BY taa.created_at DESC LIMIT 1`,
            [buildId]
          );
          if (aiRow && aiRow.summary) {
            aiSummary = aiRow.summary;
          }
        } catch (_) {}
      }

      // 7. List active alert destinations (project-specific or global)
      const destinations = await AlertDestination.list({
        projectId: build.project_id || undefined,
        enabled: true,
      });

      if (!destinations || destinations.length === 0) {
        logger.info(`No active alert destinations configured for build ${buildId}`);
        return [];
      }

      logger.info(`Found ${destinations.length} active alert destinations for build ${buildId}`);

      // 8. Dispatch matching webhooks in parallel
      const deliveryPromises = destinations.map(async (dest) => {
        // Check branch match
        if (!alertService.matchesBranch(build.branch, dest.branches)) {
          return { skipped: true, reason: `Branch ${build.branch} does not match ${dest.branches}` };
        }

        // Check event trigger
        if (!alertService.shouldTriggerEvent(dest.events, build.status, stats, previousStatus)) {
          return { skipped: true, reason: `Event rule ${dest.events} not satisfied for status ${build.status}` };
        }

        const options = {
          failedTests,
          aiSummary,
          includeAiSummary: dest.include_ai_summary,
        };

        let payload;
        if (dest.provider === 'slack') {
          payload = alertService.formatSlackPayload(build, stats, project, options);
        } else if (dest.provider === 'teams') {
          payload = alertService.formatTeamsPayload(build, stats, project, options);
        } else if (dest.provider === 'discord') {
          payload = alertService.formatDiscordPayload(build, stats, project, options);
        } else {
          payload = alertService.formatSlackPayload(build, stats, project, options);
        }

        const deliveryResult = await alertService.sendWebhookPayload(dest.provider, dest.webhook_url, payload);

        // Record delivery log
        await AlertDestination.createDeliveryLog({
          alertDestinationId: dest.id,
          buildId: build.id,
          provider: dest.provider,
          status: deliveryResult.success ? 'success' : 'failed',
          statusCode: deliveryResult.statusCode,
          latencyMs: deliveryResult.latencyMs,
          errorMessage: deliveryResult.error || null,
          payload,
        }).catch((err) => {
          logger.warn(`Failed to create delivery log for destination ${dest.id}`, { error: err.message });
        });

        return {
          destinationId: dest.id,
          provider: dest.provider,
          ...deliveryResult,
        };
      });

      const results = await Promise.allSettled(deliveryPromises);
      logger.info(`Dispatched ${results.length} alerts for build ${buildId}`);
      return results;
    } catch (error) {
      logger.error('Error dispatching build alerts', { buildId, error: error.message });
      return [];
    }
  },
};

export default alertService;
