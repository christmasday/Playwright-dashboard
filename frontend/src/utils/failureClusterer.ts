/**
 * Automated Failure Clustering Utility
 * Groups failed tests sharing the same root-cause error into clusters for fast triage.
 */

export interface ClusteredTestItem {
  id: string;
  name: string;
  title: string;
  file: string;
  status: string;
  duration: number;
  retries?: number;
  quarantined?: boolean;
  quarantine_reason?: string;
  error?: string;
  stackTrace?: string;
  errorLocation?: string;
  created_at?: string;
  steps?: any[];
}

export interface FailureCluster {
  id: string;
  category: 'timeout' | 'strict_mode' | 'assertion' | 'element_not_found' | 'network' | 'browser_crash' | 'generic';
  categoryLabel: string;
  categoryBadgeClass: string;
  categoryIcon: string;
  headline: string;
  normalizedError: string;
  rootCauseAdvice: string;
  commonStackTrace?: string;
  failingLocation?: string;
  affectedCount: number;
  affectedPercentage: number;
  affectedSpecFiles: string[];
  tests: ClusteredTestItem[];
}

export interface ClusterSummaryStats {
  totalFailedTests: number;
  totalClusters: number;
  dominantClusterName?: string;
  dominantClusterPercentage?: number;
}

/**
 * Normalizes raw error strings by stripping variable values (timestamps, durations, hashes, ephemeral ports).
 */
export function normalizeErrorMessage(rawError?: string): string {
  if (!rawError) return 'Unknown test execution failure';

  return rawError
    // Strip ANSI color codes
    .replace(/\u001b\[[0-9;]*m/g, '')
    // Strip memory addresses like 0x123456
    .replace(/0x[a-fA-F0-9]+/g, '0x<addr>')
    // Strip UUIDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '<uuid>')
    // Strip dynamic milliseconds e.g. 30000ms or 5000ms
    .replace(/\d+(\.\d+)?\s*(ms|seconds?|s)\b/gi, '<duration>')
    // Strip localhost with dynamic ports e.g. localhost:3000 -> localhost:<port>
    .replace(/localhost:\d+/g, 'localhost:<port>')
    // Strip timestamps e.g. 2026-08-22T19:42:00.000Z
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '<timestamp>')
    // Trim and normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Categorize a normalized error into a Playwright root-cause classification
 */
function classifyError(normalized: string, stack?: string): {
  category: FailureCluster['category'];
  categoryLabel: string;
  categoryBadgeClass: string;
  categoryIcon: string;
  advice: string;
} {
  const text = `${normalized} ${stack || ''}`.toLowerCase();

  if (text.includes('timeout') && (text.includes('exceeded') || text.includes('waiting for'))) {
    return {
      category: 'timeout',
      categoryLabel: 'Timeout Exceeded',
      categoryBadgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      categoryIcon: 'fa-stopwatch',
      advice: 'Target locator or page navigation did not complete in time. Verify backend latency or increase actionTimeout.',
    };
  }

  if (text.includes('strict mode violation') || text.includes('resolved to') && text.includes('elements')) {
    return {
      category: 'strict_mode',
      categoryLabel: 'Strict Mode Violation',
      categoryBadgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      categoryIcon: 'fa-layer-group',
      advice: 'Locator matched multiple DOM elements. Disambiguate with `.first()`, `.nth()`, or add specific filter text/test-id.',
    };
  }

  if (text.includes('expect(') || text.includes('expected') && text.includes('received') || text.includes('toequal') || text.includes('tobetruthy')) {
    return {
      category: 'assertion',
      categoryLabel: 'Assertion Failure',
      categoryBadgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
      categoryIcon: 'fa-times-circle',
      advice: 'The received application state did not match the expected assertion condition.',
    };
  }

  if (text.includes('not visible') || text.includes('detached from dom') || text.includes('not interactable') || text.includes('hidden')) {
    return {
      category: 'element_not_found',
      categoryLabel: 'Element Not Interactable',
      categoryBadgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      categoryIcon: 'fa-eye-slash',
      advice: 'Element was obscured, hidden, or detached before interaction could complete.',
    };
  }

  if (text.includes('500 internal server error') || text.includes('network error') || text.includes('failed to fetch') || text.includes('econnrefused')) {
    return {
      category: 'network',
      categoryLabel: 'API / Network Outage',
      categoryBadgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      categoryIcon: 'fa-network-wired',
      advice: 'Underlying API server or network service returned an error status during the test flow.',
    };
  }

  if (text.includes('target page, context or browser has been closed') || text.includes('browser closed') || text.includes('crash')) {
    return {
      category: 'browser_crash',
      categoryLabel: 'Browser Session Closed',
      categoryBadgeClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      categoryIcon: 'fa-window-close',
      advice: 'Browser process or test context terminated unexpectedly.',
    };
  }

  return {
    category: 'generic',
    categoryLabel: 'Runtime Error',
    categoryBadgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    categoryIcon: 'fa-bug',
    advice: 'Review the failing execution steps and stack trace frames below.',
  };
}

/**
 * Extracts a concise human-readable headline from a normalized error message
 */
function extractHeadline(normalized: string, category: string): string {
  const firstLine = normalized.split('\n')[0].replace(/^(Error|AssertionError):\s*/i, '').trim();

  if (firstLine.length > 90) {
    return `${firstLine.substring(0, 87)}...`;
  }
  return firstLine || `${category} occurred during test execution`;
}

/**
 * Automatically groups failed & flaky tests into failure clusters
 */
export function clusterFailures(testRuns: ClusteredTestItem[]): {
  clusters: FailureCluster[];
  stats: ClusterSummaryStats;
} {
  const failedTests = (testRuns || []).filter(
    (t) => t.status === 'failed' || t.status === 'flaky' || t.status === 'quarantined'
  );

  if (failedTests.length === 0) {
    return {
      clusters: [],
      stats: {
        totalFailedTests: 0,
        totalClusters: 0,
      },
    };
  }

  const clusterMap = new Map<string, {
    category: FailureCluster['category'];
    categoryLabel: string;
    categoryBadgeClass: string;
    categoryIcon: string;
    headline: string;
    normalizedError: string;
    rootCauseAdvice: string;
    commonStackTrace?: string;
    failingLocation?: string;
    specFiles: Set<string>;
    tests: ClusteredTestItem[];
  }>();

  for (const test of failedTests) {
    const rawError = test.error || (test.steps && test.steps.find((s: any) => s.status === 'failed' && s.error)?.error) || `Test "${test.name || test.title}" failed in ${test.file || 'spec'}`;
    const normalized = normalizeErrorMessage(rawError);
    const classification = classifyError(normalized, test.stackTrace);
    const headline = extractHeadline(normalized, classification.categoryLabel);

    // Cluster Fingerprint Signature
    // Groups tests sharing the same error category and normalized headline pattern
    const signature = `${classification.category}::${headline.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (!clusterMap.has(signature)) {
      clusterMap.set(signature, {
        category: classification.category,
        categoryLabel: classification.categoryLabel,
        categoryBadgeClass: classification.categoryBadgeClass,
        categoryIcon: classification.categoryIcon,
        headline,
        normalizedError: normalized,
        rootCauseAdvice: classification.advice,
        commonStackTrace: test.stackTrace || (test.errorLocation ? `Error: ${rawError}\n    at ${test.errorLocation}` : `Error: ${rawError}`),
        failingLocation: test.errorLocation || test.file,
        specFiles: new Set<string>(),
        tests: [],
      });
    }

    const cluster = clusterMap.get(signature)!;
    if (test.file) cluster.specFiles.add(test.file);
    cluster.tests.push(test);
  }

  // Convert to array and calculate metrics
  const clusters: FailureCluster[] = Array.from(clusterMap.entries()).map(([sig, data], index) => {
    const affectedCount = data.tests.length;
    const affectedPercentage = Math.round((affectedCount / failedTests.length) * 100);

    return {
      id: `cluster-${index + 1}-${sig.substring(0, 24)}`,
      category: data.category,
      categoryLabel: data.categoryLabel,
      categoryBadgeClass: data.categoryBadgeClass,
      categoryIcon: data.categoryIcon,
      headline: data.headline,
      normalizedError: data.normalizedError,
      rootCauseAdvice: data.rootCauseAdvice,
      commonStackTrace: data.commonStackTrace,
      failingLocation: data.failingLocation,
      affectedCount,
      affectedPercentage,
      affectedSpecFiles: Array.from(data.specFiles),
      tests: data.tests,
    };
  });

  // Sort clusters by highest affectedCount first
  clusters.sort((a, b) => b.affectedCount - a.affectedCount);

  const dominantCluster = clusters[0];

  return {
    clusters,
    stats: {
      totalFailedTests: failedTests.length,
      totalClusters: clusters.length,
      dominantClusterName: dominantCluster?.headline,
      dominantClusterPercentage: dominantCluster?.affectedPercentage,
    },
  };
}
