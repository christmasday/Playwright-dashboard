/**
 * Playwright Result Parser
 * Parses Playwright JSON reports and extracts relevant data
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

export const parsePlaywrightReport = async (reportPath) => {
  try {
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);
    
    return {
      config: parseConfig(report.config),
      stats: parseStats(report.stats),
      suites: parseSuites(report.suites),
    };
  } catch (error) {
    logger.error('Failed to parse Playwright report', { error: error.message });
    throw error;
  }
};

const parseConfig = (config) => {
  if (!config) return {};
  return {
    name: config.name,
    testDir: config.testDir,
    fullyParallel: config.fullyParallel,
    workers: config.workers,
  };
};

const parseStats = (stats) => {
  if (!stats) return {};
  return {
    expected: stats.expected,
    unexpected: stats.unexpected,
    flaky: stats.flaky,
    skipped: stats.skipped,
    duration: stats.duration,
  };
};

const parseSuites = (suites) => {
  const testRuns = [];
  
  if (!suites) return testRuns;

  for (const suite of suites) {
    testRuns.push(...parseSuite(suite));
  }

  return testRuns;
};

const parseSuite = (suite, parentTitle = '') => {
  const testRuns = [];
  
  if (!suite) return testRuns;

  const title = parentTitle ? `${parentTitle} › ${suite.title}` : suite.title;

  // Process tests in this suite
  if (suite.tests) {
    for (const test of suite.tests) {
      testRuns.push({
        ...parseTest(test),
        title,
        file: suite.file,
      });
    }
  }

  // Recursively process child suites
  if (suite.suites) {
    for (const childSuite of suite.suites) {
      testRuns.push(...parseSuite(childSuite, title));
    }
  }

  return testRuns;
};

const parseTest = (test) => {
  const status = getTestStatus(test.status, test.expectedStatus);
  const results = test.results && test.results.length > 0 ? test.results[0] : null;

  return {
    name: test.name,
    status,
    duration: results ? results.duration : 0,
    error: results ? parseError(results) : null,
    tags: extractTags(test),
    annotations: extractAnnotations(test),
    steps: results ? parseSteps(results.steps) : [],
    attachments: results ? parseAttachments(results.attachments) : [],
    startTime: results ? new Date(results.startTime) : new Date(),
  };
};

const getTestStatus = (status, expectedStatus) => {
  if (status === 'passed' && expectedStatus === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'interrupted') return 'interrupted';
  if (status === 'timedout') return 'timeout';
  return status;
};

const parseError = (result) => {
  if (!result.error) return null;

  return {
    message: result.error.message,
    stack: result.error.stack,
    location: result.error.location,
  };
};

const extractTags = (test) => {
  return test.tags || [];
};

const extractAnnotations = (test) => {
  return test.annotations || [];
};

const parseSteps = (steps) => {
  if (!steps) return [];

  return steps.map((step, index) => ({
    number: index + 1,
    title: step.title,
    category: step.category,
    status: step.error ? 'failed' : 'passed',
    duration: step.duration,
    error: step.error,
    startTime: new Date(step.startTime),
  }));
};

const parseAttachments = (attachments) => {
  if (!attachments) return [];

  return attachments.map((attachment) => ({
    name: attachment.name,
    type: attachment.contentType,
    path: attachment.path,
  }));
};

export const extractFlakyTests = (suites) => {
  const tests = extractAllTests(suites);
  const flakyTests = [];

  for (const test of tests) {
    // A test is considered flaky if it has status 'flaky'
    if (test.status === 'flaky') {
      flakyTests.push({
        testName: test.name,
        file: test.file,
        status: test.status,
        title: test.title,
      });
    }
  }

  return flakyTests;
};

const extractAllTests = (suites) => {
  const tests = [];

  const traverse = (suite) => {
    if (suite.tests) {
      tests.push(...suite.tests);
    }
    if (suite.suites) {
      for (const childSuite of suite.suites) {
        traverse(childSuite);
      }
    }
  };

  for (const suite of suites) {
    traverse(suite);
  }

  return tests;
};

export const calculateTestMetrics = (testRuns) => {
  const stats = {
    total: testRuns.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    timeout: 0,
    interrupted: 0,
    totalDuration: 0,
    averageDuration: 0,
  };

  for (const test of testRuns) {
    stats[test.status]++;
    stats.totalDuration += test.duration || 0;
  }

  stats.averageDuration = stats.total > 0 ? Math.round(stats.totalDuration / stats.total) : 0;

  return stats;
};

export default {
  parsePlaywrightReport,
  extractFlakyTests,
  calculateTestMetrics,
};
