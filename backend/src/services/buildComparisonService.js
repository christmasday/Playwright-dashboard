/**
 * Build Comparison Service
 * Compares two builds (Base vs Target) and detects regressions, fixes,
 * duration changes, and consistency metrics.
 */

import { Build, TestRun, TestResult } from '../models/index.js';
import logger from '../utils/logger.js';

export const getCanonicalTestKey = (test) => {
  if (!test) return '';
  const file = (test.file || '').trim();
  const title = (test.title || '').trim();
  const name = (test.name || '').trim();

  if (file && title) return `${file} > ${title}`;
  if (file && name) return `${file} > ${name}`;
  return name || title || test.id || 'unknown-test';
};

const enrichTestRunsWithErrorDetails = async (testRuns) => {
  const failedRuns = testRuns.filter((t) => t.status === 'failed' || t.status === 'flaky');
  if (failedRuns.length === 0) return testRuns;

  const stepResults = await Promise.all(
    failedRuns.map(async (run) => {
      try {
        const rawSteps = await TestResult.findByTestRunId(run.id);
        const failedStep = (rawSteps || []).find((s) => s.status === 'failed' && s.error);
        return {
          id: run.id,
          error: run.error || (failedStep ? failedStep.error : null),
          errorLocation: failedStep ? (failedStep.error_location || failedStep.errorLocation) : null,
          stackTrace:
            run.stack_trace ||
            run.stackTrace ||
            (failedStep
              ? failedStep.error_location
                ? `${failedStep.error}\n    at ${failedStep.error_location}`
                : failedStep.error
              : null),
        };
      } catch (err) {
        return { id: run.id, error: run.error || null, errorLocation: null, stackTrace: null };
      }
    })
  );

  const stepMap = new Map(stepResults.map((s) => [s.id, s]));
  return testRuns.map((run) => {
    const extra = stepMap.get(run.id);
    if (!extra) return run;
    return {
      ...run,
      error: extra.error || run.error || null,
      errorLocation: extra.errorLocation || run.errorLocation || null,
      stackTrace: extra.stackTrace || run.stackTrace || null,
    };
  });
};

export const buildComparisonService = {
  /**
   * Compare Base Build against Target Build
   */
  compareBuilds: async (baseBuildId, targetBuildId) => {
    try {
      if (!baseBuildId || !targetBuildId) {
        throw new Error('Both baseBuildId and targetBuildId are required');
      }

      // Fetch build records in parallel
      const [baseBuild, targetBuild] = await Promise.all([
        Build.findById(baseBuildId),
        Build.findById(targetBuildId),
      ]);

      if (!baseBuild) {
        throw new Error(`Base build with ID "${baseBuildId}" not found`);
      }
      if (!targetBuild) {
        throw new Error(`Target build with ID "${targetBuildId}" not found`);
      }

      // Fetch test runs for both builds in parallel
      const [rawBaseRuns, rawTargetRuns] = await Promise.all([
        TestRun.findByBuildId(baseBuildId, 2000),
        TestRun.findByBuildId(targetBuildId, 2000),
      ]);

      // Enrich runs with error and step context
      const [baseRuns, targetRuns] = await Promise.all([
        enrichTestRunsWithErrorDetails(rawBaseRuns),
        enrichTestRunsWithErrorDetails(rawTargetRuns),
      ]);

      // Index base test runs by canonical key
      const baseMap = new Map();
      for (const run of baseRuns) {
        const key = getCanonicalTestKey(run);
        baseMap.set(key, run);
      }

      // Index target test runs by canonical key
      const targetMap = new Map();
      for (const run of targetRuns) {
        const key = getCanonicalTestKey(run);
        targetMap.set(key, run);
      }

      // Collect all unique test keys preserving order
      const allKeys = new Set([...targetMap.keys(), ...baseMap.keys()]);

      const comparisons = [];
      let basePassedCount = 0;
      let targetPassedCount = 0;
      let baseTotalDuration = 0;
      let targetTotalDuration = 0;

      for (const key of allKeys) {
        const base = baseMap.get(key) || null;
        const target = targetMap.get(key) || null;

        if (base && base.status === 'passed') basePassedCount++;
        if (target && target.status === 'passed') targetPassedCount++;

        if (base) baseTotalDuration += base.duration || 0;
        if (target) targetTotalDuration += target.duration || 0;

        const baseStatus = base?.status || null;
        const targetStatus = target?.status || null;

        const baseDuration = base?.duration || 0;
        const targetDuration = target?.duration || 0;
        const durationDelta = target && base ? targetDuration - baseDuration : 0;
        const durationPercentChange =
          target && base && baseDuration > 0
            ? Math.round(((targetDuration - baseDuration) / baseDuration) * 100)
            : null;

        // A duration regression: at least 500ms slower AND at least 25% increase
        const isDurationRegression =
          target &&
          base &&
          durationDelta >= 500 &&
          (durationPercentChange === null || durationPercentChange >= 25);

        let statusDelta = 'unchanged';
        if (!base && target) {
          statusDelta = 'added';
        } else if (base && !target) {
          statusDelta = 'removed';
        } else if (
          (baseStatus === 'passed' || baseStatus === 'skipped') &&
          (targetStatus === 'failed' || targetStatus === 'timeout')
        ) {
          statusDelta = 'regression';
        } else if (
          (baseStatus === 'failed' || baseStatus === 'timeout') &&
          targetStatus === 'passed'
        ) {
          statusDelta = 'fix';
        } else if (
          (baseStatus === 'failed' || baseStatus === 'timeout') &&
          (targetStatus === 'failed' || targetStatus === 'timeout')
        ) {
          statusDelta = 'consistent_failure';
        } else if (baseStatus === 'passed' && targetStatus === 'passed') {
          statusDelta = 'consistent_pass';
        } else if (baseStatus === 'flaky' || targetStatus === 'flaky') {
          statusDelta = 'flaky_changed';
        }

        const testItem = {
          key,
          file: target?.file || base?.file || 'unknown',
          title: target?.title || base?.title || key,
          name: target?.name || base?.name || key,
          statusDelta,
          isDurationRegression,
          durationDelta,
          durationPercentChange,
          base: base
            ? {
                id: base.id,
                status: base.status,
                duration: base.duration || 0,
                retries: base.retries || 0,
                error: base.error || null,
                errorLocation: base.errorLocation || null,
                stackTrace: base.stackTrace || null,
              }
            : null,
          target: target
            ? {
                id: target.id,
                status: target.status,
                duration: target.duration || 0,
                retries: target.retries || 0,
                error: target.error || null,
                errorLocation: target.errorLocation || null,
                stackTrace: target.stackTrace || null,
              }
            : null,
        };

        comparisons.push(testItem);
      }

      // Partition into categorized arrays
      const regressions = comparisons.filter((c) => c.statusDelta === 'regression');
      const fixes = comparisons.filter((c) => c.statusDelta === 'fix');
      const consistentFailures = comparisons.filter((c) => c.statusDelta === 'consistent_failure');
      const consistentPasses = comparisons.filter((c) => c.statusDelta === 'consistent_pass');
      const durationRegressions = comparisons.filter((c) => c.isDurationRegression);
      const added = comparisons.filter((c) => c.statusDelta === 'added');
      const removed = comparisons.filter((c) => c.statusDelta === 'removed');
      const flakyChanged = comparisons.filter((c) => c.statusDelta === 'flaky_changed');

      const baseTestCount = baseRuns.length;
      const targetTestCount = targetRuns.length;
      const basePassRate = baseTestCount > 0 ? Math.round((basePassedCount / baseTestCount) * 100) : 0;
      const targetPassRate = targetTestCount > 0 ? Math.round((targetPassedCount / targetTestCount) * 100) : 0;

      const summary = {
        totalCompared: comparisons.length,
        baseTestCount,
        targetTestCount,
        testCountDelta: targetTestCount - baseTestCount,
        regressionsCount: regressions.length,
        fixesCount: fixes.length,
        consistentFailuresCount: consistentFailures.length,
        consistentPassesCount: consistentPasses.length,
        durationRegressionsCount: durationRegressions.length,
        addedCount: added.length,
        removedCount: removed.length,
        flakyCount: flakyChanged.length,
        basePassRate,
        targetPassRate,
        passRateDelta: targetPassRate - basePassRate,
        baseDuration: baseTotalDuration,
        targetDuration: targetTotalDuration,
        durationDelta: targetTotalDuration - baseTotalDuration,
      };

      return {
        baseBuild: {
          id: baseBuild.id,
          name: baseBuild.name,
          branch: baseBuild.branch,
          commitHash: baseBuild.commit_hash || baseBuild.commitHash,
          commitMessage: baseBuild.commit_message || baseBuild.commitMessage,
          environment: baseBuild.environment,
          status: baseBuild.status,
          createdAt: baseBuild.created_at || baseBuild.createdAt,
          endedAt: baseBuild.ended_at || baseBuild.endedAt,
        },
        targetBuild: {
          id: targetBuild.id,
          name: targetBuild.name,
          branch: targetBuild.branch,
          commitHash: targetBuild.commit_hash || targetBuild.commitHash,
          commitMessage: targetBuild.commit_message || targetBuild.commitMessage,
          environment: targetBuild.environment,
          status: targetBuild.status,
          createdAt: targetBuild.created_at || targetBuild.createdAt,
          endedAt: targetBuild.ended_at || targetBuild.endedAt,
        },
        summary,
        regressions,
        fixes,
        consistentFailures,
        consistentPasses,
        durationRegressions,
        added,
        removed,
        allTests: comparisons,
      };
    } catch (error) {
      logger.error('Error comparing builds', { error: error.message, baseBuildId, targetBuildId });
      throw error;
    }
  },
};

export default buildComparisonService;
