/**
 * Advanced QA Analytics & Flakiness Insights Page
 * Multi-dimensional insights into test execution trends, duration benchmarks, root causes, and spec file health.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import apiService from '../services/api';

// Color Palette for Dark UI
const THEME = {
  passed: '#10b981',
  failed: '#ef4444',
  flaky: '#f59e0b',
  skipped: '#6b7280',
  accent: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  bgCard: '#14141b',
  border: '#20202a',
  textMuted: '#9a9aa5',
  textFg: '#f4f4f7',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

interface ProjectItem {
  id: string;
  name: string;
}

interface OverviewData {
  totalBuilds: number;
  totalTestRuns: number;
  totalUniqueTests?: number;
  passedRuns: number;
  failedRuns: number;
  flakyRuns: number;
  flakyUniqueTests?: number;
  skippedRuns: number;
  quarantinedRuns: number;
  totalRetries: number;
  passRate: number;
  flakinessRate: number;
  failureRate: number;
  stabilityIndex: number;
  duration: {
    avg: number;
    p50: number;
    p90: number;
    p95: number;
  };
}

interface TrendPoint {
  date: string;
  buildsCount: number;
  totalRuns: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  passRate: number;
  flakyRate: number;
  avgDuration: number;
  p95Duration: number;
}

interface SlowTest {
  testName: string;
  file: string;
  totalRuns: number;
  passed: number;
  failed: number;
  passRate: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
}

interface FlakinessData {
  rootCauseCategories: { name: string; count: number }[];
  highRiskTests: {
    id: string;
    testName: string;
    file: string;
    flakinessScore: number;
    failureCount: number;
    totalRuns: number;
    quarantineStatus: 'active' | 'quarantined' | 'resolved';
    riskTier: 'Critical' | 'High' | 'Medium';
    lastSeen?: string;
  }[];
}

interface DistributionData {
  environments: { name: string; totalRuns: number; buildsCount: number; passRate: number }[];
  browsers: { name: string; count: number }[];
}

interface SpecHealthItem {
  file: string;
  totalRuns: number;
  passed: number;
  failed: number;
  flaky: number;
  passRate: number;
  flakinessScore: number;
  avgDuration: number;
  maxDuration: number;
  lastRunAt: string;
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#101017] border border-[#20202a] p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 text-[#f4f4f7]">
        <p className="font-semibold text-xs border-b border-[#20202a] pb-1 mb-1 text-[#9a9aa5]">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.stroke || entry.fill }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}></span>
              {entry.name}:
            </span>
            <span className="font-mono font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics: React.FC = () => {
  // Global Filters
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'trends' | 'flakiness' | 'coverage' | 'specs'>('trends');

  // Data states
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [slowestTests, setSlowestTests] = useState<SlowTest[]>([]);
  const [flakiness, setFlakiness] = useState<FlakinessData | null>(null);
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [specHealth, setSpecHealth] = useState<SpecHealthItem[]>([]);
  const [specSearch, setSpecSearch] = useState<string>('');

  // UI status
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load Projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await apiService.listProjects().catch(() => ({ data: { data: [] } }));
        setProjects(res.data?.data || res.data?.projects || []);
      } catch (err) {
        console.error('Failed to load projects list:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch all analytics datasets
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = {
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
        timeRange,
        environment: environmentFilter !== 'all' ? environmentFilter : undefined,
      };

      const [overviewRes, trendsRes, slowestRes, flakinessRes, distRes, specRes] = await Promise.all([
        apiService.getAnalyticsOverview(params).catch(() => ({ data: { data: null } })),
        apiService.getAnalyticsTrends(params).catch(() => ({ data: { data: [] } })),
        apiService.getSlowestTests({ ...params, limit: 10 }).catch(() => ({ data: { data: [] } })),
        apiService.getFlakinessInsights(params).catch(() => ({ data: { data: null } })),
        apiService.getAnalyticsDistribution(params).catch(() => ({ data: { data: null } })),
        apiService.getSpecHealth(params).catch(() => ({ data: { data: [] } })),
      ]);

      setOverview(overviewRes.data?.data || null);
      setTrends(trendsRes.data?.data || []);
      setSlowestTests(slowestRes.data?.data || []);
      setFlakiness(flakinessRes.data?.data || null);
      setDistribution(distRes.data?.data || null);
      setSpecHealth(specRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load analytics datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, selectedProjectId, environmentFilter]);

  // Export handler
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      const params = {
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
        timeRange,
        environment: environmentFilter !== 'all' ? environmentFilter : undefined,
        format,
      };

      const res = await apiService.exportAnalyticsReport(params);
      
      let blob: Blob;
      let filename = `qa-analytics-${timeRange}.${format}`;

      if (format === 'csv') {
        blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      } else {
        const jsonStr = JSON.stringify(res.data, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification(`Report exported successfully (${format.toUpperCase()})`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setNotification('Failed to export report.');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  // 1-Click Quarantine toggle for flaky tests
  const handleToggleQuarantine = async (testId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'quarantined' ? 'active' : 'quarantined';
    try {
      await apiService.updateFlakyQuarantine(testId, newStatus, 'Quarantined via Analytics insights');
      setNotification(`Test marked as ${newStatus.toUpperCase()}`);
      setTimeout(() => setNotification(null), 3000);
      // Refresh flakiness data
      const res = await apiService.getFlakinessInsights({
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
        timeRange,
        environment: environmentFilter !== 'all' ? environmentFilter : undefined,
      });
      setFlakiness(res.data?.data || null);
    } catch (err) {
      console.error('Failed to update quarantine status:', err);
    }
  };

  // Filtered spec health based on search query
  const filteredSpecs = useMemo(() => {
    if (!specSearch.trim()) return specHealth;
    const queryStr = specSearch.toLowerCase();
    return specHealth.filter((s) => s.file.toLowerCase().includes(queryStr));
  }, [specHealth, specSearch]);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f7] p-6 lg:p-10 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 bg-[#14141b] border border-[#3b82f6] text-[#f4f4f7] rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse"></span>
          {notification}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#20202a] pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="w-9 h-9 rounded-xl bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-chart-line text-sm"></i>
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">QA Analytics & Flakiness Insights</h1>
          </div>
          <p className="text-xs text-[#9a9aa5]">
            Comprehensive test suite telemetry, duration regressions, flakiness root causes, and spec reliability.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex bg-[#14141b] border border-[#20202a] rounded-xl p-1 text-xs">
            {[
              { id: '7d', label: '7D' },
              { id: '14d', label: '14D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'all', label: 'ALL' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  timeRange === t.id
                    ? 'bg-[#3b82f6] text-white shadow-sm'
                    : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Project Dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-[#14141b] border border-[#20202a] text-xs text-[#f4f4f7] rounded-xl focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Environment Filter */}
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#14141b] border border-[#20202a] text-xs text-[#f4f4f7] rounded-xl focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="all">All Environments</option>
            <option value="ci">CI</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="local">Local</option>
          </select>

          {/* Export Buttons */}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-3 py-1.5 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-xs font-semibold text-[#f4f4f7] rounded-xl transition-colors inline-flex items-center gap-1.5"
            title="Download CSV Report"
          >
            <i className="fas fa-file-csv text-[#3b82f6]"></i> CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-3 py-1.5 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-xs font-semibold text-[#f4f4f7] rounded-xl transition-colors inline-flex items-center gap-1.5"
            title="Download JSON Report"
          >
            <i className="fas fa-file-code text-[#10b981]"></i> JSON
          </button>

          {/* Reload Button */}
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 flex items-center justify-center text-xs text-[#9a9aa5] hover:text-[#f4f4f7] transition-colors"
            title="Refresh Metrics"
          >
            <i className={`fas fa-sync-alt ${loading ? 'animate-spin text-[#3b82f6]' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Loading Skeleton Indicator */}
      {loading && !overview && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#9a9aa5]">Aggregating test runs and performance benchmarks...</p>
        </div>
      )}

      {overview && (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Overall Pass Rate */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>Pass Rate</span>
                <i className="fas fa-check-circle text-emerald-400"></i>
              </div>
              <p className="text-3xl font-extrabold text-emerald-400 mt-2">{overview.passRate}%</p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">
                {overview.passedRuns.toLocaleString()} / {overview.totalTestRuns.toLocaleString()} passed
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/30"></div>
            </div>

            {/* Stability Index */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>Stability Index</span>
                <i className="fas fa-shield-alt text-[#3b82f6]"></i>
              </div>
              <p className="text-3xl font-extrabold text-[#3b82f6] mt-2">{overview.stabilityIndex}/100</p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">
                {overview.stabilityIndex >= 90 ? 'Rock Solid' : overview.stabilityIndex >= 75 ? 'Moderate Risk' : 'High Flakiness'}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30"></div>
            </div>

            {/* Flakiness Rate */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>Flakiness Rate</span>
                <i className="fas fa-bolt text-amber-400"></i>
              </div>
              <p className="text-3xl font-extrabold text-amber-400 mt-2">{overview.flakinessRate}%</p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">
                {overview.flakyUniqueTests && overview.flakyUniqueTests > 0
                  ? `${overview.flakyUniqueTests} flaky specs (${overview.flakyRuns} runs)`
                  : `${overview.flakyRuns} flaky runs (${overview.quarantinedRuns} quarantined)`}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/30"></div>
            </div>

            {/* Average Duration */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>Avg Duration</span>
                <i className="fas fa-stopwatch text-purple-400"></i>
              </div>
              <p className="text-3xl font-extrabold text-purple-400 mt-2">
                {overview.duration.avg >= 1000 ? `${(overview.duration.avg / 1000).toFixed(1)}s` : `${overview.duration.avg}ms`}
              </p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">Median (P50): {overview.duration.p50}ms</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500/30"></div>
            </div>

            {/* P95 Latency */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>P95 Duration</span>
                <i className="fas fa-tachometer-alt text-cyan-400"></i>
              </div>
              <p className="text-3xl font-extrabold text-cyan-400 mt-2">
                {overview.duration.p95 >= 1000 ? `${(overview.duration.p95 / 1000).toFixed(1)}s` : `${overview.duration.p95}ms`}
              </p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">95th percentile benchmark</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500/30"></div>
            </div>

            {/* Total Executions */}
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-5 relative overflow-hidden group hover:border-[#3b82f6]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-[#9a9aa5] font-semibold uppercase tracking-wider">
                <span>Executions</span>
                <i className="fas fa-layer-group text-pink-400"></i>
              </div>
              <p className="text-3xl font-extrabold text-pink-400 mt-2">{overview.totalTestRuns.toLocaleString()}</p>
              <p className="text-[11px] text-[#9a9aa5] mt-1">Across {overview.totalBuilds.toLocaleString()} builds</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500/30"></div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-[#20202a] space-x-6 text-xs font-semibold">
            {[
              { id: 'trends', label: 'Performance & Velocity', icon: 'fas fa-chart-area' },
              { id: 'flakiness', label: 'Flakiness & Root Causes', icon: 'fas fa-bug' },
              { id: 'coverage', label: 'Browser & Environment', icon: 'fas fa-globe' },
              { id: 'specs', label: 'Spec File Health Matrix', icon: 'fas fa-file-code' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3.5 transition-all inline-flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#3b82f6] text-[#3b82f6]'
                    : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PERFORMANCE & VELOCITY */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Pass Rate & Duration Dual-Axis Trend */}
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#f4f4f7]">Pass Rate vs. P95 Duration Trend</h3>
                    <p className="text-xs text-[#9a9aa5]">Historical stability & latency performance over the selected timeframe</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-[#9a9aa5]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span> Pass Rate (%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-[#3b82f6]"></span> P95 Duration (ms)
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full pt-4">
                  {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="passRateGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
                        <XAxis dataKey="date" stroke="#5e5e68" fontSize={11} tickLine={false} />
                        <YAxis yAxisId="left" stroke="#10b981" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} unit="ms" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="passRate"
                          name="Pass Rate (%)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#passRateGrad)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="p95Duration"
                          name="P95 Duration (ms)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#9a9aa5]">
                      No historical execution points in the selected range.
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Volume & Top Slowest Tests Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Execution Volume Breakdown */}
                <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-[#f4f4f7]">Test Execution Volume</h3>
                  <p className="text-xs text-[#9a9aa5]">Passed, failed, flaky, and skipped tests executed per day</p>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
                        <XAxis dataKey="date" stroke="#5e5e68" fontSize={11} tickLine={false} />
                        <YAxis stroke="#5e5e68" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="passed" name="Passed" stackId="a" fill={THEME.passed} />
                        <Bar dataKey="failed" name="Failed" stackId="a" fill={THEME.failed} />
                        <Bar dataKey="flaky" name="Flaky" stackId="a" fill={THEME.flaky} />
                        <Bar dataKey="skipped" name="Skipped" stackId="a" fill={THEME.skipped} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Slowest Tests */}
                <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#f4f4f7]">Top Slowest Tests</h3>
                    <p className="text-xs text-[#9a9aa5]">Specs with the highest average execution duration</p>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-64 pr-2">
                    {slowestTests.length > 0 ? (
                      slowestTests.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#101017] border border-[#20202a] rounded-xl flex items-center justify-between gap-3 text-xs hover:border-[#3b82f6]/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#f4f4f7] truncate">{t.testName}</p>
                            <p className="text-[11px] font-mono text-[#9a9aa5] truncate">{t.file}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-bold text-purple-400 font-mono">
                              {t.avgDuration >= 1000 ? `${(t.avgDuration / 1000).toFixed(2)}s` : `${t.avgDuration}ms`}
                            </span>
                            <span className="text-[10px] text-[#9a9aa5] block">max: {(t.maxDuration / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#9a9aa5] text-center py-8">No slow test benchmarks recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLAKINESS & ROOT CAUSES */}
          {activeTab === 'flakiness' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Failure Root Cause Categories Donut */}
                <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#f4f4f7]">Failure Root Causes</h3>
                    <p className="text-xs text-[#9a9aa5]">Classification of errors captured across test runs</p>
                  </div>

                  <div className="h-64 w-full relative flex items-center justify-center">
                    {flakiness && flakiness.rootCauseCategories.some((c) => c.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={flakiness.rootCauseCategories.filter((c) => c.count > 0)}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {flakiness.rootCauseCategories.filter((c) => c.count > 0).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-[#9a9aa5] text-center">No failure errors detected.</div>
                    )}
                  </div>

                  {/* Legend list */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#9a9aa5]">
                    {flakiness?.rootCauseCategories.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        ></span>
                        <span className="truncate">{c.name}:</span>
                        <span className="font-bold text-[#f4f4f7]">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* High-Risk Flaky Tests & 1-Click Quarantine */}
                <div className="lg:col-span-2 bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#f4f4f7]">High-Risk Flaky Tests</h3>
                      <p className="text-xs text-[#9a9aa5]">Tests with the highest instability and failure scores</p>
                    </div>
                    <Link
                      to="/flaky-tests"
                      className="text-xs text-[#3b82f6] hover:underline font-semibold"
                    >
                      View All Flaky Tests →
                    </Link>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
                    {flakiness && flakiness.highRiskTests.length > 0 ? (
                      flakiness.highRiskTests.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 bg-[#101017] border border-[#20202a] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#3b82f6]/40 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  t.riskTier === 'Critical'
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : t.riskTier === 'High'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}
                              >
                                {t.riskTier} Risk
                              </span>
                              <span className="text-xs font-bold text-[#f4f4f7] truncate">{t.testName}</span>
                            </div>
                            <p className="text-[11px] font-mono text-[#9a9aa5] truncate">{t.file}</p>
                            <p className="text-[10px] text-[#9a9aa5] mt-1">
                              Score: <strong className="text-amber-400">{t.flakinessScore}%</strong> · {t.failureCount} fails / {t.totalRuns} runs
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleToggleQuarantine(t.id, t.quarantineStatus)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                                t.quarantineStatus === 'quarantined'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-[#14141b] border border-[#20202a] text-[#f4f4f7] hover:border-amber-400'
                              }`}
                            >
                              <i className={`fas ${t.quarantineStatus === 'quarantined' ? 'fa-unlock' : 'fa-lock'}`}></i>
                              {t.quarantineStatus === 'quarantined' ? 'Quarantined' : 'Quarantine'}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#9a9aa5] text-center py-10">No flaky tests detected in this timeframe.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COVERAGE & ENVIRONMENTS */}
          {activeTab === 'coverage' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Browser Distribution */}
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-[#f4f4f7]">Browser Engine Coverage</h3>
                <p className="text-xs text-[#9a9aa5]">Test run distribution across Chromium, Firefox, WebKit, and Mobile</p>
                <div className="h-64 w-full">
                  {distribution && distribution.browsers.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribution.browsers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#20202a" vertical={false} />
                        <XAxis dataKey="name" stroke="#5e5e68" fontSize={11} tickLine={false} />
                        <YAxis stroke="#5e5e68" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Test Runs" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          {distribution.browsers.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#9a9aa5]">
                      No browser metrics available.
                    </div>
                  )}
                </div>
              </div>

              {/* Environment Distribution */}
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-[#f4f4f7]">Environment Breakdown</h3>
                <p className="text-xs text-[#9a9aa5]">Pass rates and build counts across deployment targets</p>
                <div className="space-y-3">
                  {distribution && distribution.environments.length > 0 ? (
                    distribution.environments.map((env, idx) => (
                      <div key={idx} className="p-4 bg-[#101017] border border-[#20202a] rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#f4f4f7]">{env.name}</span>
                          <span className="font-mono text-emerald-400 font-bold">{env.passRate}% Pass Rate</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-[#14141b] rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${env.passRate}%` }}></div>
                          <div className="bg-red-500 h-full" style={{ width: `${100 - env.passRate}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#9a9aa5]">
                          <span>{env.buildsCount} Builds</span>
                          <span>{env.totalRuns.toLocaleString()} Tests Executed</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#9a9aa5] text-center py-10">No environment data found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SPEC FILE HEALTH MATRIX */}
          {activeTab === 'specs' && (
            <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#f4f4f7]">Spec File Health & Reliability</h3>
                  <p className="text-xs text-[#9a9aa5]">Granular health metrics, duration averages, and flakiness per test specification file</p>
                </div>
                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <i className="fas fa-search absolute left-3 top-2.5 text-xs text-[#9a9aa5]"></i>
                  <input
                    type="text"
                    value={specSearch}
                    onChange={(e) => setSpecSearch(e.target.value)}
                    placeholder="Search spec files..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#101017] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#101017] border-b border-[#20202a] text-[#9a9aa5]">
                    <tr>
                      <th className="p-3.5 font-semibold">Spec File</th>
                      <th className="p-3.5 font-semibold text-center">Health</th>
                      <th className="p-3.5 font-semibold text-center">Total Runs</th>
                      <th className="p-3.5 font-semibold">Pass Rate</th>
                      <th className="p-3.5 font-semibold text-center">Flakiness</th>
                      <th className="p-3.5 font-semibold text-right">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20202a] text-[#9a9aa5]">
                    {filteredSpecs.length > 0 ? (
                      filteredSpecs.map((spec, idx) => (
                        <tr key={idx} className="hover:bg-[#101017]/60 transition-colors">
                          <td className="p-3.5 font-mono text-[#f4f4f7] font-medium">{spec.file}</td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                spec.healthStatus === 'Healthy'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : spec.healthStatus === 'Warning'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {spec.healthStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-[#f4f4f7]">{spec.totalRuns}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-[#20202a] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${spec.passRate}%` }}
                                ></div>
                              </div>
                              <span className="font-mono font-bold text-[#f4f4f7]">{spec.passRate}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-semibold text-amber-400">
                            {spec.flakinessScore}%
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-purple-400">
                            {spec.avgDuration >= 1000 ? `${(spec.avgDuration / 1000).toFixed(2)}s` : `${spec.avgDuration}ms`}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#9a9aa5]">
                          No spec file matches found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
