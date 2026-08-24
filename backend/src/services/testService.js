/**
 * Test Service
 * Handles test data operations and workflows
 */

import { TestRun, TestResult, Artifact, FlakyTest, Build, Metrics } from '../models/index.js';
import { transaction } from '../config/database.js';
import { calculateTestMetrics } from '../utils/playwrightParser.js';
import logger from '../utils/logger.js';

export const testService = {
  /**
   * Ingest test results from Playwright report
   */
  ingestTestResults: async (buildId, parsedReport) => {
    // Wrap ingestion in a DB transaction to ensure atomicity
    return transaction(async (client) => {
      try {
        const testRuns = [];

        // Calculate overall metrics
        const stats = calculateTestMetrics(parsedReport.suites || []);

        // Store test runs inside the same transaction client
        for (const suite of parsedReport.suites || []) {
          const testRunsFromSuite = await processTestSuite(suite, buildId, client);
          testRuns.push(...testRunsFromSuite);
        }

        // Store metrics
        await storeMetrics(buildId, stats, client);

        // Update Build status and ended_at time upon ingestion completion
        const hasFailures = stats.failed > 0 || testRuns.some((t) => t.status === 'failed');
        const hasPasses = stats.passed > 0 || testRuns.some((t) => t.status === 'passed');
        const finalStatus = hasFailures ? 'failed' : hasPasses ? 'passed' : 'completed';

        try {
          await Build.update(buildId, {
            status: finalStatus,
            endedAt: new Date(),
          });
        } catch (updateErr) {
          logger.warn(`Failed to update build status for ${buildId}`, { error: updateErr.message });
        }

        logger.info(`Ingested ${testRuns.length} test results for build ${buildId}, status set to ${finalStatus}`);

        return testRuns;
      } catch (error) {
        logger.error('Error ingesting test results', { error: error.message });
        throw error;
      }
    });
  },

  /**
   * Get test details with steps and artifacts
   */
  getTestDetails: async (testRunId) => {
    try {
      const testRun = await TestRun.findById(testRunId);
      if (!testRun) {
        throw new Error(`Test run ${testRunId} not found`);
      }

      const rawSteps = await TestResult.findByTestRunId(testRunId);
      const artifacts = await Artifact.findByTestRunId(testRunId);

      const steps = (rawSteps || []).map((s) => ({
        ...s,
        stepTitle: s.step_title || s.stepTitle || s.title || s.name || '',
        stepNumber: s.step_number || s.stepNumber || 1,
        error: s.error || null,
        errorLocation: s.error_location || s.errorLocation || null,
      }));

      const failedSteps = steps.filter((s) => s.status === 'failed');
      const failedStepWithMsg = failedSteps.find((s) => s.error && s.error.trim() !== '');

      let error = testRun.error || (failedStepWithMsg ? failedStepWithMsg.error : null);
      if (!error && testRun.status === 'failed') {
        if (failedSteps.length > 0) {
          const stepNames = failedSteps
            .map((s) => s.stepTitle || s.title || `Step ${s.stepNumber}`)
            .join(' -> ');
          error = `Test assertion failed at step: ${stepNames}`;
        } else {
          error = `Test assertion failed in spec ${testRun.file || testRun.name}`;
        }
      }

      let stackTrace = testRun.stack_trace || testRun.stackTrace;
      if (!stackTrace && error && testRun.status === 'failed') {
        const errorLoc = (failedStepWithMsg && failedStepWithMsg.errorLocation) || testRun.file;
        stackTrace = errorLoc ? `Error: ${error}\n    at ${errorLoc}:1:1` : `Error: ${error}`;
      }

      return {
        ...testRun,
        error: error || null,
        stackTrace: stackTrace || null,
        steps,
        artifacts,
      };
    } catch (error) {
      logger.error('Error getting test details', { error: error.message });
      throw error;
    }
  },

  /**
   * Get build summary with test statistics
   */
  getBuildSummary: async (buildId) => {
    try {
      const build = await Build.findById(buildId);
      if (!build) {
        throw new Error(`Build ${buildId} not found`);
      }

      const testRuns = await TestRun.findByBuildId(buildId);
      const artifacts = await Artifact.findByBuildId(buildId);

      // Calculate statistics
      const stats = {
        total: testRuns.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        totalDuration: 0,
      };

      for (const test of testRuns) {
        if (test.status === 'passed') stats.passed++;
        else if (test.status === 'failed') stats.failed++;
        else if (test.status === 'skipped') stats.skipped++;
        else if (test.status === 'flaky') stats.flaky++;

        stats.totalDuration += test.duration || 0;
      }

      const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
      const failureRate = stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;

      return {
        build,
        stats: {
          ...stats,
          passRate,
          failureRate,
          averageDuration: stats.total > 0 ? Math.round(stats.totalDuration / stats.total) : 0,
        },
        testCount: testRuns.length,
        artifactCount: artifacts.length,
      };
    } catch (error) {
      logger.error('Error getting build summary', { error: error.message });
      throw error;
    }
  },

  /**
   * Get flaky tests for a build or globally
   */
  getFlakyTests: async (buildId = null, limit = 50) => {
    try {
      const flakyTests = await FlakyTest.list(limit);
      return flakyTests;
    } catch (error) {
      logger.error('Error getting flaky tests', { error: error.message });
      throw error;
    }
  },

  /**
   * Update flakiness score based on test failures
   */
  updateFlakiness: async (testName, file, failed, total) => {
    try {
      let flakyTest = await FlakyTest.findByTestName(testName, file);

      if (!flakyTest) {
        // Create new flaky test entry
        flakyTest = await FlakyTest.create({
          testName,
          file,
          flakinessScore: failed / total * 100,
        });
      } else {
        // Update existing
        const newFailureCount = (parseInt(flakyTest.failure_count) || 0) + (failed ? 1 : 0);
        const newTotalRuns = (parseInt(flakyTest.total_runs) || 0) + total;
        const newFlakinessScore = (newFailureCount / newTotalRuns) * 100;

        flakyTest = await FlakyTest.updateFlakiness(flakyTest.id, {
          failureCount: newFailureCount,
          totalRuns: newTotalRuns,
          flakinessScore: newFlakinessScore,
        });
      }

      return flakyTest;
    } catch (error) {
      logger.error('Error updating flakiness', { error: error.message });
      throw error;
    }
  },
};

// Helper functions
async function processTestSuite(suite, buildId, client = null) {
  const testRuns = [];

  // Process individual tests
  if (suite.tests) {
    for (const test of suite.tests) {
      const testRun = await TestRun.create({
        buildId,
        name: test.name,
        title: suite.title,
        file: suite.file,
        tags: test.tags,
        status: test.status,
        duration: test.duration,
        startedAt: test.startTime,
      }, client);

      testRuns.push(testRun);

      // Store test steps
      if (test.steps) {
        for (let i = 0; i < test.steps.length; i++) {
          const step = test.steps[i];
          let stepError = null;
          let stepErrorLocation = null;
          if (step.error) {
            stepError =
              typeof step.error === 'object'
                ? step.error.message || step.error.stack || String(step.error)
                : String(step.error);
            stepErrorLocation =
              typeof step.error === 'object' && step.error.location
                ? `${step.error.location.file || ''}:${step.error.location.line || ''}:${step.error.location.column || ''}`
                : step.errorLocation || null;
          }
          await TestResult.create(
            {
              testRunId: testRun.id,
              buildId,
              stepNumber: i + 1,
              stepTitle: step.title,
              status: step.status || (stepError ? 'failed' : 'passed'),
              duration: step.duration || 0,
              error: stepError,
              errorLocation: stepErrorLocation,
            },
            client
          );
        }
      }

      // Store artifacts
      if (test.attachments) {
        for (const attachment of test.attachments) {
          let type = attachment.type || 'log';
          const nameLower = String(attachment.name || '').toLowerCase();
          const pathLower = String(attachment.path || '').toLowerCase();

          if (nameLower.includes('screenshot') || pathLower.endsWith('.png') || pathLower.endsWith('.jpg') || pathLower.endsWith('.jpeg')) {
            type = 'screenshot';
          } else if (nameLower.includes('video') || pathLower.endsWith('.webm') || pathLower.endsWith('.mp4')) {
            type = 'video';
          } else if (nameLower.includes('trace') || pathLower.endsWith('.zip')) {
            type = 'trace';
          } else if (nameLower.includes('log') || pathLower.endsWith('.log') || pathLower.endsWith('.txt')) {
            type = 'log';
          }

          let fileUrl = attachment.url || attachment.path || '';
          if (fileUrl && (fileUrl.startsWith('/') || fileUrl.includes('/'))) {
            fileUrl = `/api/tests/artifact-file?path=${encodeURIComponent(fileUrl)}`;
          }

          await Artifact.create({
            testRunId: testRun.id,
            buildId,
            type,
            name: attachment.name || type,
            path: attachment.path,
            url: fileUrl,
          }, client);
        }
      }
    }
  }

  // Recursively process child suites
  if (suite.suites) {
    for (const childSuite of suite.suites) {
      const childTestRuns = await processTestSuite(childSuite, buildId, client);
      testRuns.push(...childTestRuns);
    }
  }

  return testRuns;
}

async function storeMetrics(buildId, stats, client = null) {
  const metricsToStore = [
    { metricType: 'test_count', metricKey: 'total', metricValue: stats.total },
    { metricType: 'test_count', metricKey: 'passed', metricValue: stats.passed },
    { metricType: 'test_count', metricKey: 'failed', metricValue: stats.failed },
    { metricType: 'test_count', metricKey: 'skipped', metricValue: stats.skipped },
    { metricType: 'duration', metricKey: 'total_duration', metricValue: stats.totalDuration },
    { metricType: 'duration', metricKey: 'average_duration', metricValue: stats.averageDuration },
  ];

  for (const metric of metricsToStore) {
    await Metrics.create({
      buildId,
      ...metric,
      recordedAt: new Date(),
    }, client);
  }
}

export default testService;
