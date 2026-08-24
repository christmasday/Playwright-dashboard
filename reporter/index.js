'use strict';

/**
 * Playwright Dashboard Reporter
 *
 * Streams Playwright test results to a self-hosted Playwright Dashboard.
 * It is a no-op unless an API key is attached (via `apiKey` option or the
 * DASHBOARD_API_KEY environment variable), matching the dashboard's
 * X-API-Key authenticated ingest endpoints.
 */

const DEFAULT_API_URL = 'http://localhost:3002/api';

function transformSuite(suite) {
  return {
    title: suite.title,
    file: suite.file || (suite.location ? suite.location.file : null),
    tests: (suite.tests || []).map(transformTest),
    suites: (suite.suites || []).map(transformSuite),
  };
}

function extractSteps(stepsList) {
  if (!Array.isArray(stepsList)) return [];
  const list = [];
  for (const step of stepsList) {
    if (step.title) {
      let stepError = null;
      let errorLocation = null;
      if (step.error) {
        if (typeof step.error === 'object') {
          stepError = step.error.message || step.error.stack || step.error.value || String(step.error);
          if (step.error.location) {
            errorLocation = `${step.error.location.file}:${step.error.location.line}:${step.error.location.column}`;
          }
        } else {
          stepError = String(step.error);
        }
      }
      list.push({
        title: step.title,
        status: step.error ? 'failed' : 'passed',
        duration: step.duration || 0,
        error: stepError,
        errorLocation,
      });
    }
    if (step.steps && step.steps.length > 0) {
      list.push(...extractSteps(step.steps));
    }
  }
  return list;
}

function transformTest(testCase) {
  const results = testCase.results || [];
  const result = results[results.length - 1] || {};
  const steps = extractSteps(result.steps || []);
  const attachments = (result.attachments || []).map((att) => ({
    name: att.name,
    type: att.contentType || att.type || 'application/octet-stream',
    path: att.path || null,
    url: att.path || null,
  }));

  // Extract comprehensive error, stack trace, and location
  let errorMessage = null;
  let stackTrace = null;
  let errorLocation = null;

  if (result.error) {
    errorMessage = result.error.message || result.error.value || String(result.error);
    stackTrace = result.error.stack || result.error.snippet || result.error.message || null;
    if (result.error.location) {
      errorLocation = `${result.error.location.file}:${result.error.location.line}:${result.error.location.column}`;
    }
  } else if (result.errors && result.errors.length > 0) {
    const firstErr = result.errors[0];
    errorMessage = firstErr.message || firstErr.value || String(firstErr);
    stackTrace = firstErr.stack || firstErr.snippet || firstErr.message || null;
    if (firstErr.location) {
      errorLocation = `${firstErr.location.file}:${firstErr.location.line}:${firstErr.location.column}`;
    }
  }

  // Fallback to step error if error is not at the root test level
  if (!errorMessage) {
    const failedStep = steps.find((s) => s.error);
    if (failedStep) {
      errorMessage = failedStep.error;
      errorLocation = failedStep.errorLocation;
      stackTrace = failedStep.errorLocation ? `${failedStep.error}\n    at ${failedStep.errorLocation}` : failedStep.error;
    }
  }

  // If still failed without custom error message, synthesize an exact descriptive error
  if (!errorMessage && result.status === 'failed') {
    const failedSteps = steps.filter((s) => s.status === 'failed');
    if (failedSteps.length > 0) {
      const stepNames = failedSteps.map((s) => s.title).join(' -> ');
      errorMessage = `Test failed at step: ${stepNames}`;
    } else {
      errorMessage = `Test "${testCase.title}" failed execution`;
    }
  }

  return {
    name: testCase.title,
    title: testCase.title,
    status: result.status || 'skipped',
    duration: result.duration || 0,
    startTime: result.startTime || null,
    tags: testCase.tags || [],
    error: errorMessage,
    stackTrace,
    errorLocation,
    retries: results.length > 1 ? results.length - 1 : (result.retry || 0),
    steps,
    attachments,
  };
}

function resolveBuildName(options) {
  if (options.buildName) return options.buildName;
  if (process.env.DASHBOARD_BUILD_NAME) return process.env.DASHBOARD_BUILD_NAME;
  if (process.env.GITHUB_RUN_ID) return `ci-${process.env.GITHUB_RUN_ID}`;
  return `playwright-${Date.now()}`;
}

class PlaywrightDashboardReporter {
  constructor(options = {}) {
    this.url = String(
      options.url || process.env.DASHBOARD_URL || DEFAULT_API_URL
    ).replace(/\/$/, '');
    this.apiKey = options.apiKey || process.env.DASHBOARD_API_KEY || '';
    this.buildName = resolveBuildName(options);
    this.projectName = options.projectName || process.env.DASHBOARD_PROJECT || '';
    this.rootSuite = null;

    // Integration only works when an API key is attached.
    this.enabled = Boolean(this.apiKey);
    if (!this.enabled) {
      // eslint-disable-next-line no-console
      console.warn(
        '[playwright-dashboard-reporter] No API key attached — reporter disabled. ' +
          'Set the `apiKey` option or the DASHBOARD_API_KEY env var to enable reporting.'
      );
    }
  }

  onBegin(config, suite) {
    this.rootSuite = suite;
  }

  async onEnd(result) {
    if (!this.enabled) return;
    try {
      const buildId = await this.createBuild();
      const suiteRoot = this.rootSuite || result;
      const rawSuites = suiteRoot
        ? (suiteRoot.suites && suiteRoot.suites.length > 0 ? suiteRoot.suites : [suiteRoot])
        : [];
      const suites = rawSuites.map(transformSuite);
      await this.ingest(buildId, { suites });
      // eslint-disable-next-line no-console
      console.log(
        `[playwright-dashboard-reporter] Reported run to ${this.url} (build ${buildId})`
      );
    } catch (err) {
      // Never fail the test run because reporting broke.
      // eslint-disable-next-line no-console
      console.error('[playwright-dashboard-reporter] Failed to report results:', err.message);
    }
  }

  async createBuild() {
    const res = await fetch(`${this.url}/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ name: this.buildName, projectName: this.projectName }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`create build ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data && (data.id || (data.data && data.data.id));
  }

  async ingest(buildId, results) {
    const res = await fetch(`${this.url}/tests/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ buildId, results }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ingest ${res.status}: ${text}`);
    }
    return res.json();
  }
}

module.exports = PlaywrightDashboardReporter;
