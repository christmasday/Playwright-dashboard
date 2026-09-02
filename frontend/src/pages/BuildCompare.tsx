/**
 * Build-to-Build Run Comparison ("Compare Runs")
 * Compare any two test builds to detect regressions, fixes, duration changes,
 * and generate GitHub PR Markdown summaries.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiService from '../services/api';

interface BuildRecord {
  id: string;
  name: string;
  branch?: string;
  commitHash?: string;
  commit_hash?: string;
  commitMessage?: string;
  commit_message?: string;
  environment?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
  endedAt?: string;
  ended_at?: string;
  project_name?: string;
  projectName?: string;
  projectId?: string;
  project_id?: string;
}

interface ComparedTestItem {
  key: string;
  file: string;
  title: string;
  name: string;
  statusDelta:
    | 'regression'
    | 'fix'
    | 'consistent_failure'
    | 'consistent_pass'
    | 'added'
    | 'removed'
    | 'flaky_changed'
    | 'unchanged';
  isDurationRegression: boolean;
  durationDelta: number;
  durationPercentChange: number | null;
  base: {
    id: string;
    status: string;
    duration: number;
    retries?: number;
    error?: string | null;
    errorLocation?: string | null;
    stackTrace?: string | null;
  } | null;
  target: {
    id: string;
    status: string;
    duration: number;
    retries?: number;
    error?: string | null;
    errorLocation?: string | null;
    stackTrace?: string | null;
  } | null;
}

interface ComparisonData {
  baseBuild: BuildRecord;
  targetBuild: BuildRecord;
  summary: {
    totalCompared: number;
    baseTestCount: number;
    targetTestCount: number;
    testCountDelta: number;
    regressionsCount: number;
    fixesCount: number;
    consistentFailuresCount: number;
    consistentPassesCount: number;
    durationRegressionsCount: number;
    addedCount: number;
    removedCount: number;
    flakyCount: number;
    basePassRate: number;
    targetPassRate: number;
    passRateDelta: number;
    baseDuration: number;
    targetDuration: number;
    durationDelta: number;
  };
  regressions: ComparedTestItem[];
  fixes: ComparedTestItem[];
  consistentFailures: ComparedTestItem[];
  consistentPasses: ComparedTestItem[];
  durationRegressions: ComparedTestItem[];
  added: ComparedTestItem[];
  removed: ComparedTestItem[];
  allTests: ComparedTestItem[];
}

const formatDuration = (ms: number): string => {
  if (ms < 0) return `-${formatDuration(Math.abs(ms))}`;
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

const getStatusBadge = (status?: string | null) => {
  if (!status) return <span className="text-[#5e5e68] text-xs">N/A</span>;
  switch (status.toLowerCase()) {
    case 'passed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <i className="fas fa-check-circle text-[10px]"></i> Passed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
          <i className="fas fa-times-circle text-[10px]"></i> Failed
        </span>
      );
    case 'flaky':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <i className="fas fa-bolt text-[10px]"></i> Flaky
        </span>
      );
    case 'skipped':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
          <i className="fas fa-forward text-[10px]"></i> Skipped
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#20202a] text-[#9a9aa5]">
          {status}
        </span>
      );
  }
};

const BuildCompare: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const baseParam = searchParams.get('baseBuildId') || searchParams.get('base') || '';
  const targetParam = searchParams.get('targetBuildId') || searchParams.get('target') || '';

  const [availableBuilds, setAvailableBuilds] = useState<BuildRecord[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);

  const [baseBuildId, setBaseBuildId] = useState<string>(baseParam);
  const [targetBuildId, setTargetBuildId] = useState<string>(targetParam);

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'regressions' | 'fixes' | 'duration' | 'consistent_failures' | 'added' | 'removed' | 'all'
  >('regressions');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedPrSummary, setCopiedPrSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch builds list for selector dropdowns
  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        setLoadingBuilds(true);
        const resp = await apiService.listBuilds({ limit: 100 });
        const list = resp.data?.builds || resp.data?.data || [];
        setAvailableBuilds(list);

        // Auto-select initial builds if query params weren't passed
        if (!baseParam && !targetParam && list.length >= 2) {
          setTargetBuildId(list[0].id);
          setBaseBuildId(list[1].id);
          setSearchParams({ targetBuildId: list[0].id, baseBuildId: list[1].id });
        } else if (!baseParam && targetParam && list.length >= 2) {
          const second = list.find((b: any) => b.id !== targetParam);
          if (second) {
            setBaseBuildId(second.id);
            setSearchParams({ targetBuildId: targetParam, baseBuildId: second.id });
          }
        }
      } catch (err: any) {
        console.error('Failed to load builds for comparison:', err);
      } finally {
        setLoadingBuilds(false);
      }
    };

    fetchBuilds();
  }, []);

  // Synchronize state with URL parameters
  useEffect(() => {
    if (baseParam && baseParam !== baseBuildId) setBaseBuildId(baseParam);
    if (targetParam && targetParam !== targetBuildId) setTargetBuildId(targetParam);
  }, [baseParam, targetParam]);

  // Execute comparison when both IDs are available
  useEffect(() => {
    if (!baseBuildId || !targetBuildId) {
      setComparison(null);
      return;
    }

    if (baseBuildId === targetBuildId) {
      setError('Please select two different builds to compare.');
      setComparison(null);
      return;
    }

    const runCompare = async () => {
      try {
        setLoadingComparison(true);
        setError(null);
        const resp = await apiService.compareBuilds(baseBuildId, targetBuildId);
        const data: ComparisonData = resp.data;
        setComparison(data);

        // Auto-select appropriate tab
        if (data.summary.regressionsCount > 0) {
          setActiveTab('regressions');
        } else if (data.summary.fixesCount > 0) {
          setActiveTab('fixes');
        } else if (data.summary.durationRegressionsCount > 0) {
          setActiveTab('duration');
        } else {
          setActiveTab('all');
        }
      } catch (err: any) {
        console.error('Failed to compare builds:', err);
        setError(err.response?.data?.error || err.message || 'Failed to compare selected builds.');
        setComparison(null);
      } finally {
        setLoadingComparison(false);
      }
    };

    runCompare();
  }, [baseBuildId, targetBuildId]);

  // Swap Base and Target builds
  const handleSwapBuilds = () => {
    const temp = baseBuildId;
    setBaseBuildId(targetBuildId);
    setTargetBuildId(temp);
    setSearchParams({ targetBuildId: temp, baseBuildId: targetBuildId });
  };

  const handleSelectBase = (id: string) => {
    setBaseBuildId(id);
    setSearchParams({ targetBuildId, baseBuildId: id });
  };

  const handleSelectTarget = (id: string) => {
    setTargetBuildId(id);
    setSearchParams({ targetBuildId: id, baseBuildId });
  };

  // Toggle row expansion
  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter list by search query and active tab
  const displayedTests = useMemo(() => {
    if (!comparison) return [];
    let items: ComparedTestItem[] = [];

    switch (activeTab) {
      case 'regressions':
        items = comparison.regressions;
        break;
      case 'fixes':
        items = comparison.fixes;
        break;
      case 'duration':
        items = comparison.durationRegressions;
        break;
      case 'consistent_failures':
        items = comparison.consistentFailures;
        break;
      case 'added':
        items = comparison.added;
        break;
      case 'removed':
        items = comparison.removed;
        break;
      case 'all':
      default:
        items = comparison.allTests;
        break;
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (t) =>
        t.file.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.target?.error && t.target.error.toLowerCase().includes(q)) ||
        (t.base?.error && t.base.error.toLowerCase().includes(q))
    );
  }, [comparison, activeTab, searchQuery]);

  // Generate GitHub PR Markdown summary
  const generatePrMarkdown = (): string => {
    if (!comparison) return '';
    const { baseBuild, targetBuild, summary } = comparison;

    const baseCommit = (baseBuild.commitHash || baseBuild.commit_hash || 'baseline').substring(0, 7);
    const targetCommit = (targetBuild.commitHash || targetBuild.commit_hash || 'target').substring(0, 7);
    const passRateIcon = summary.passRateDelta >= 0 ? '🟢' : '🔴';
    const durationIcon = summary.durationDelta <= 0 ? '⚡️' : '⏱️';

    let md = `## 🎭 Playwright Test Run Comparison\n\n`;
    md += `Comparing **${targetBuild.name}** (\`${targetCommit}\` on \`${targetBuild.branch || 'current'}\`) with Base **${baseBuild.name}** (\`${baseCommit}\` on \`${baseBuild.branch || 'main'}\`):\n\n`;

    md += `| Metric | Base Run | Target Run | Change |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    md += `| **Pass Rate** | ${summary.basePassRate}% | ${summary.targetPassRate}% | ${passRateIcon} ${summary.passRateDelta >= 0 ? '+' : ''}${summary.passRateDelta}% |\n`;
    md += `| **Total Tests** | ${summary.baseTestCount} | ${summary.targetTestCount} | ${summary.testCountDelta >= 0 ? '+' : ''}${summary.testCountDelta} |\n`;
    md += `| **Suite Duration** | ${formatDuration(summary.baseDuration)} | ${formatDuration(summary.targetDuration)} | ${durationIcon} ${summary.durationDelta >= 0 ? '+' : ''}${formatDuration(summary.durationDelta)} |\n`;
    md += `| **New Regressions** | — | — | 🔴 **${summary.regressionsCount}** |\n`;
    md += `| **Fixed Tests** | — | — | 🟢 **${summary.fixesCount}** |\n`;
    md += `| **Slowdown Alerts** | — | — | ⏱️ **${summary.durationRegressionsCount}** |\n\n`;

    if (comparison.regressions.length > 0) {
      md += `### 🚨 Newly Introduced Regressions (${comparison.regressions.length})\n\n`;
      md += `| Spec File | Test Case | Target Duration | Error Snippet |\n`;
      md += `| :--- | :--- | :---: | :--- |\n`;
      for (const reg of comparison.regressions.slice(0, 10)) {
        const err = (reg.target?.error || 'Assertion failed').replace(/\n/g, ' ').substring(0, 80);
        md += `| \`${reg.file}\` | ${reg.title} | ${formatDuration(reg.target?.duration || 0)} | \`${err}...\` |\n`;
      }
      if (comparison.regressions.length > 10) {
        md += `\n*... and ${comparison.regressions.length - 10} more regressions.*\n`;
      }
      md += `\n`;
    }

    if (comparison.fixes.length > 0) {
      md += `### ✅ Tests Fixed in this Run (${comparison.fixes.length})\n\n`;
      for (const fix of comparison.fixes.slice(0, 5)) {
        md += `- **${fix.title}** (\`${fix.file}\`)\n`;
      }
      if (comparison.fixes.length > 5) {
        md += `- *... and ${comparison.fixes.length - 5} more fixes.*\n`;
      }
      md += `\n`;
    }

    md += `---\n*Report generated by [Playwright Dashboard](${window.location.origin}/builds/compare?baseBuildId=${baseBuild.id}&targetBuildId=${targetBuild.id})*`;
    return md;
  };

  const handleCopyPrSummary = () => {
    const md = generatePrMarkdown();
    navigator.clipboard.writeText(md);
    setCopiedPrSummary(true);
    setTimeout(() => setCopiedPrSummary(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9a9aa5] mb-1">
            <Link to="/builds" className="hover:text-[#f4f4f7] transition-colors">
              Builds
            </Link>
            <span>/</span>
            <span className="text-[#3b82f6]">Compare Runs</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm">
              <i className="fas fa-code-compare"></i>
            </span>
            Build-to-Build Run Comparison
          </h1>
          <p className="text-xs text-[#9a9aa5] mt-1">
            Compare two test suites side-by-side to isolate newly introduced regressions, verify fixes, and track duration changes.
          </p>
        </div>

        {/* Global Action Toolbar */}
        {comparison && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-[#14141b] hover:bg-[#1c1c26] border border-[#20202a] text-[#f4f4f7] text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
              title="Copy shareable link"
            >
              <i className={`fas ${copiedLink ? 'fa-check text-emerald-400' : 'fa-link'}`}></i>
              {copiedLink ? 'Link Copied!' : 'Share Link'}
            </button>

            <button
              onClick={handleCopyPrSummary}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              title="Copy formatted markdown to paste in a PR comment"
            >
              <i className={`fas ${copiedPrSummary ? 'fa-check' : 'fa-clipboard'}`}></i>
              {copiedPrSummary ? 'Markdown Copied!' : 'Copy PR Summary'}
            </button>
          </div>
        )}
      </div>

      {/* Dual Build Selector Toolbar */}
      <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] items-center gap-4">
          {/* Base Build Selector */}
          <div className="bg-[#14141b] border border-[#20202a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#9a9aa5] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Base Build (Baseline / Reference)
              </span>
              {comparison?.baseBuild && getStatusBadge(comparison.baseBuild.status)}
            </div>

            <select
              value={baseBuildId}
              onChange={(e) => handleSelectBase(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#20202a] text-[#f4f4f7] rounded-lg px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#3b82f6] transition-colors"
              disabled={loadingBuilds}
            >
              <option value="">-- Select Base Build --</option>
              {availableBuilds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.branch || 'main'}) - {new Date(b.createdAt || b.created_at || '').toLocaleDateString()} [{b.status}]
                </option>
              ))}
            </select>

            {comparison?.baseBuild && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#9a9aa5] pt-2 border-t border-[#20202a]">
                <span className="font-mono bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                  <i className="fas fa-code-branch text-[#5e5e68] mr-1"></i>
                  {comparison.baseBuild.branch || 'main'}
                </span>
                {comparison.baseBuild.commitHash && (
                  <span className="font-mono bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                    <i className="fas fa-code-commit text-[#5e5e68] mr-1"></i>
                    {comparison.baseBuild.commitHash.substring(0, 7)}
                  </span>
                )}
                {comparison.baseBuild.environment && (
                  <span className="capitalize bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                    {comparison.baseBuild.environment}
                  </span>
                )}
                <Link
                  to={`/builds/${comparison.baseBuild.id}`}
                  className="text-blue-400 hover:underline ml-auto flex items-center gap-1"
                >
                  View Details <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                </Link>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapBuilds}
              className="w-10 h-10 rounded-full bg-[#1c1c26] hover:bg-blue-600/20 hover:text-blue-400 border border-[#20202a] text-[#9a9aa5] flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-md"
              title="Swap Base and Target builds"
            >
              <i className="fas fa-arrow-right-arrow-left"></i>
            </button>
          </div>

          {/* Target Build Selector */}
          <div className="bg-[#14141b] border border-[#20202a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Target Build (Current / Pull Request)
              </span>
              {comparison?.targetBuild && getStatusBadge(comparison.targetBuild.status)}
            </div>

            <select
              value={targetBuildId}
              onChange={(e) => handleSelectTarget(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#20202a] text-[#f4f4f7] rounded-lg px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#3b82f6] transition-colors"
              disabled={loadingBuilds}
            >
              <option value="">-- Select Target Build --</option>
              {availableBuilds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.branch || 'main'}) - {new Date(b.createdAt || b.created_at || '').toLocaleDateString()} [{b.status}]
                </option>
              ))}
            </select>

            {comparison?.targetBuild && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#9a9aa5] pt-2 border-t border-[#20202a]">
                <span className="font-mono bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                  <i className="fas fa-code-branch text-[#5e5e68] mr-1"></i>
                  {comparison.targetBuild.branch || 'main'}
                </span>
                {comparison.targetBuild.commitHash && (
                  <span className="font-mono bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                    <i className="fas fa-code-commit text-[#5e5e68] mr-1"></i>
                    {comparison.targetBuild.commitHash.substring(0, 7)}
                  </span>
                )}
                {comparison.targetBuild.environment && (
                  <span className="capitalize bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#20202a]">
                    {comparison.targetBuild.environment}
                  </span>
                )}
                <Link
                  to={`/builds/${comparison.targetBuild.id}`}
                  className="text-blue-400 hover:underline ml-auto flex items-center gap-1"
                >
                  View Details <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                </Link>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loadingComparison && (
        <div className="p-12 text-center text-[#9a9aa5] bg-[#101017] border border-[#20202a] rounded-2xl space-y-4">
          <div className="inline-block animate-spin text-3xl text-blue-500">
            <i className="fas fa-circle-notch"></i>
          </div>
          <p className="text-sm font-medium">Computing diff and comparing execution histories...</p>
        </div>
      )}

      {/* Empty Selection State */}
      {!loadingComparison && !comparison && !error && (
        <div className="p-16 text-center text-[#9a9aa5] bg-[#101017] border border-[#20202a] rounded-2xl space-y-3">
          <i className="fas fa-code-compare text-4xl text-[#3b82f6]/40"></i>
          <h3 className="text-lg font-semibold text-[#f4f4f7]">Select Two Builds to Compare</h3>
          <p className="text-xs max-w-md mx-auto text-[#9a9aa5]">
            Choose a baseline build and a target build from the dropdowns above to analyze test regressions, timing bottlenecks, and fixes.
          </p>
        </div>
      )}

      {/* Comparison Results */}
      {!loadingComparison && comparison && (
        <>
          {/* Executive Delta Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Regressions */}
            <div
              onClick={() => setActiveTab('regressions')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                activeTab === 'regressions'
                  ? 'bg-red-500/15 border-red-500/50 shadow-lg shadow-red-500/10'
                  : 'bg-[#101017] border-[#20202a] hover:border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Regressions</span>
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-times"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                {comparison.summary.regressionsCount}
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                Passed in base, failed here
              </div>
            </div>

            {/* Fixes */}
            <div
              onClick={() => setActiveTab('fixes')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                activeTab === 'fixes'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-[#101017] border-[#20202a] hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Fixed Tests</span>
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-check"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {comparison.summary.fixesCount}
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                Failed in base, passed here
              </div>
            </div>

            {/* Duration Regressions */}
            <div
              onClick={() => setActiveTab('duration')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                activeTab === 'duration'
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-[#101017] border-[#20202a] hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Slowdown Alerts</span>
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-gauge-high"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {comparison.summary.durationRegressionsCount}
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                &gt;25% and &gt;500ms slower
              </div>
            </div>

            {/* Consistent Failures */}
            <div
              onClick={() => setActiveTab('consistent_failures')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                activeTab === 'consistent_failures'
                  ? 'bg-purple-500/15 border-purple-500/50'
                  : 'bg-[#101017] border-[#20202a] hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Consistent Failures</span>
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-triangle-exclamation"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {comparison.summary.consistentFailuresCount}
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                Broken in both runs
              </div>
            </div>

            {/* Pass Rate Delta */}
            <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Pass Rate</span>
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-percent"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-[#f4f4f7] flex items-baseline gap-2">
                {comparison.summary.targetPassRate}%
                <span
                  className={`text-xs font-semibold ${
                    comparison.summary.passRateDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {comparison.summary.passRateDelta >= 0 ? '+' : ''}
                  {comparison.summary.passRateDelta}%
                </span>
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                Base was {comparison.summary.basePassRate}%
              </div>
            </div>

            {/* Duration Delta */}
            <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] mb-2">
                <span>Suite Duration</span>
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                  <i className="fas fa-clock"></i>
                </span>
              </div>
              <div className="text-2xl font-bold text-[#f4f4f7] flex items-baseline gap-2">
                {formatDuration(comparison.summary.targetDuration)}
                <span
                  className={`text-xs font-semibold ${
                    comparison.summary.durationDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {comparison.summary.durationDelta >= 0 ? '+' : ''}
                  {formatDuration(comparison.summary.durationDelta)}
                </span>
              </div>
              <div className="text-[11px] text-[#9a9aa5] mt-1">
                Base was {formatDuration(comparison.summary.baseDuration)}
              </div>
            </div>
          </div>

          {/* Categorized Tabs & Search Bar */}
          <div className="bg-[#101017] border border-[#20202a] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#20202a] flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('regressions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'regressions'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  <i className="fas fa-times-circle text-[10px]"></i>
                  Regressions
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.regressionsCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('fixes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'fixes'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  <i className="fas fa-check-circle text-[10px]"></i>
                  Fixes
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.fixesCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('duration')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'duration'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  <i className="fas fa-gauge-high text-[10px]"></i>
                  Slowdowns
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.durationRegressionsCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('consistent_failures')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'consistent_failures'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  <i className="fas fa-triangle-exclamation text-[10px]"></i>
                  Consistent Failures
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.consistentFailuresCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('added')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'added'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  <i className="fas fa-plus text-[10px]"></i>
                  Added
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.addedCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-[#20202a] text-[#f4f4f7]'
                      : 'text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#1c1c26]'
                  }`}
                >
                  All Tests
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                    {comparison.summary.totalCompared}
                  </span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e68] text-xs"></i>
                <input
                  type="text"
                  placeholder="Filter by title, spec file, or error..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#20202a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>
            </div>

            {/* Test Comparison List */}
            {displayedTests.length === 0 ? (
              <div className="p-12 text-center text-[#9a9aa5] space-y-2">
                <i className="fas fa-check-circle text-3xl text-emerald-400/40"></i>
                <h4 className="text-sm font-semibold text-[#f4f4f7]">
                  No tests found in this category
                </h4>
                <p className="text-xs text-[#9a9aa5]">
                  {activeTab === 'regressions'
                    ? '🎉 Clean build! Zero new test regressions detected between these two runs.'
                    : 'Try selecting another tab or clearing your filter search query.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#20202a]">
                {displayedTests.map((test) => {
                  const isExpanded = !!expandedRows[test.key];
                  const hasError = test.target?.error || test.base?.error;

                  return (
                    <div
                      key={test.key}
                      className="p-4 hover:bg-[#14141b]/70 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Test Spec & Title */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0a0a0f] border border-[#20202a] text-[#9a9aa5]">
                              {test.file}
                            </span>

                            {/* Status Change Tag */}
                            {test.statusDelta === 'regression' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                🚨 Regression
                              </span>
                            )}
                            {test.statusDelta === 'fix' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                ✅ Fixed
                              </span>
                            )}
                            {test.isDurationRegression && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                ⏱️ Slowdown
                              </span>
                            )}
                            {test.statusDelta === 'consistent_failure' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
                                Consistent Failure
                              </span>
                            )}
                            {test.statusDelta === 'added' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
                                New Test
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-sm text-[#f4f4f7] truncate">
                            {test.title}
                          </h3>
                        </div>

                        {/* Status & Timing Diff Comparison */}
                        <div className="flex items-center gap-6 self-start lg:self-center">
                          {/* Base Run */}
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-[#5e5e68]">
                              Base Run
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {getStatusBadge(test.base?.status)}
                              <span className="font-mono text-xs text-[#9a9aa5]">
                                {test.base ? formatDuration(test.base.duration) : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <i className="fas fa-arrow-right text-[#5e5e68] text-xs"></i>

                          {/* Target Run */}
                          <div className="text-left">
                            <div className="text-[10px] uppercase tracking-wider text-[#5e5e68]">
                              Target Run
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {getStatusBadge(test.target?.status)}
                              <span className="font-mono text-xs text-[#f4f4f7]">
                                {test.target ? formatDuration(test.target.duration) : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Duration Delta Badge */}
                          <div className="w-24 text-right">
                            {test.target && test.base ? (
                              <span
                                className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                                  test.durationDelta > 500
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : test.durationDelta < -500
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'text-[#9a9aa5]'
                                }`}
                              >
                                {test.durationDelta >= 0 ? '+' : ''}
                                {formatDuration(test.durationDelta)}
                              </span>
                            ) : (
                              <span className="text-xs text-[#5e5e68]">—</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {hasError && (
                              <button
                                onClick={() => toggleRow(test.key)}
                                className="px-2.5 py-1 text-xs rounded-lg border border-[#20202a] bg-[#0a0a0f] hover:bg-[#1c1c26] text-[#9a9aa5] hover:text-[#f4f4f7] transition-all flex items-center gap-1.5"
                                title="Toggle error stack trace diff"
                              >
                                <i
                                  className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}
                                ></i>
                                {isExpanded ? 'Hide Error' : 'View Error'}
                              </button>
                            )}

                            {test.target && (
                              <Link
                                to={`/tests/${test.target.id}`}
                                className="px-2.5 py-1 text-xs rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all flex items-center gap-1"
                                title="Inspect test run details"
                              >
                                Details <i className="fas fa-arrow-right text-[9px]"></i>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Error Diff Drawer */}
                      {isExpanded && hasError && (
                        <div className="mt-4 pt-4 border-t border-[#20202a] grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Base Error */}
                          <div className="bg-[#0a0a0f] border border-[#20202a] rounded-xl p-3">
                            <div className="text-[11px] font-semibold text-[#9a9aa5] mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Base Build Error Message
                            </div>
                            {test.base?.error ? (
                              <pre className="text-xs font-mono text-red-400/90 whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin">
                                {test.base.error}
                              </pre>
                            ) : (
                              <p className="text-xs text-emerald-400 italic">
                                No error in base run (test passed or was skipped).
                              </p>
                            )}
                          </div>

                          {/* Target Error */}
                          <div className="bg-[#0a0a0f] border border-red-500/30 rounded-xl p-3">
                            <div className="text-[11px] font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Target Build Error Message
                            </div>
                            {test.target?.error ? (
                              <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin">
                                {test.target.error}
                              </pre>
                            ) : (
                              <p className="text-xs text-emerald-400 italic">
                                No error in target run (test passed).
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BuildCompare;
