/**
 * Build Details Page
 * View build overview and list of test runs belonging to a build.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/api';
import FailureClusterViewer from '../components/Visualization/FailureClusterViewer';
import { clusterFailures, ClusteredTestItem } from '../utils/failureClusterer';

interface BuildInfo {
  id: string;
  name: string;
  branch?: string;
  commit_hash?: string;
  commit_message?: string;
  environment?: string;
  status: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  project_id?: string;
  project_name?: string;
}

const BuildDetails: React.FC = () => {
  const { buildId } = useParams<{ buildId: string }>();
  const [buildSummary, setBuildSummary] = useState<any | null>(null);
  const [testRuns, setTestRuns] = useState<ClusteredTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'clusters' | 'all'>('clusters');

  const fetchDetails = async () => {
    if (!buildId) return;

    try {
      setLoading(true);
      const [summaryResp, testsResp] = await Promise.all([
        apiService.getBuildSummary(buildId).catch(() => null),
        apiService.getTestsByStatus(buildId, 'all', 500).catch(() => ({ data: [] })),
      ]);

      if (summaryResp?.data) {
        setBuildSummary(summaryResp.data);
      }

      const rawTests = testsResp?.data?.tests || testsResp?.data?.data || (Array.isArray(testsResp?.data) ? testsResp.data : []);
      const safeTests = Array.isArray(rawTests) ? rawTests : [];
      setTestRuns(safeTests);

      // Default to clusters view if failures exist, otherwise flat list
      const hasFailures = safeTests.some((t) => t.status === 'failed' || t.status === 'flaky');
      setViewMode(hasFailures ? 'clusters' : 'all');
    } catch (err) {
      console.error('Error fetching build details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [buildId]);

  // Compute Failure Clusters
  const failureClustersData = useMemo(() => {
    return clusterFailures(testRuns);
  }, [testRuns]);

  // Filter test runs
  const filteredTests = useMemo(() => {
    if (!Array.isArray(testRuns)) return [];
    return testRuns.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        (t.title && typeof t.title === 'string' && t.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.name && typeof t.name === 'string' && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.file && typeof t.file === 'string' && t.file.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [testRuns, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#9a9aa5] space-y-3">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading build & failure cluster analytics…</p>
      </div>
    );
  }

  const build: BuildInfo | null = buildSummary?.build || null;
  const safeTestRuns = Array.isArray(testRuns) ? testRuns : [];
  const stats = buildSummary?.stats || {
    total: safeTestRuns.length,
    passed: safeTestRuns.filter((t) => t.status === 'passed').length,
    failed: safeTestRuns.filter((t) => t.status === 'failed').length,
    skipped: safeTestRuns.filter((t) => t.status === 'skipped').length,
    flaky: safeTestRuns.filter((t) => t.status === 'flaky').length,
    passRate: safeTestRuns.length > 0 ? Math.round((safeTestRuns.filter((t) => t.status === 'passed').length / safeTestRuns.length) * 100) : 0,
    averageDuration: safeTestRuns.length > 0 ? Math.round(safeTestRuns.reduce((acc, t) => acc + (t.duration || 0), 0) / safeTestRuns.length) : 0,
  };

  const hasFailures = failureClustersData.clusters.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Build Header */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs text-[#9a9aa5] mb-3">
          <Link to="/builds" className="hover:text-[#f4f4f7] transition-colors">
            Builds
          </Link>
          <span>/</span>
          <span className="text-[#f4f4f7] font-mono">{build?.name || buildId}</span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-[#f4f4f7]">{build?.name || 'Test Build'}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                  build?.status === 'passed'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : build?.status === 'failed'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}
              >
                {build?.status || 'running'}
              </span>
            </div>
            <p className="text-xs text-[#9a9aa5] mt-1">
              Branch: <code className="text-[#3b82f6]">{build?.branch || 'main'}</code> • Created on{' '}
              {build?.created_at ? new Date(build.created_at).toLocaleString() : ''}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs bg-[#0e0e13] text-[#9a9aa5] px-3 py-1.5 rounded-lg border border-[#20202a]">
              Avg Duration: <strong className="text-[#f4f4f7]">{stats.averageDuration}ms</strong>
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-semibold">
              Pass Rate: {stats.passRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
          <p className="text-xs text-[#9a9aa5]">Total Tests</p>
          <p className="text-2xl font-bold text-[#f4f4f7] mt-1">{stats.total}</p>
        </div>
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
          <p className="text-xs text-[#9a9aa5]">Passed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.passed}</p>
        </div>
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
          <p className="text-xs text-[#9a9aa5]">Failed</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
          <p className="text-xs text-[#9a9aa5]">Flaky / Quarantined</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.flaky || 0}</p>
        </div>
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
          <p className="text-xs text-[#9a9aa5]">Skipped</p>
          <p className="text-2xl font-bold text-[#9a9aa5] mt-1">{stats.skipped || 0}</p>
        </div>
      </div>

      {/* View Switcher Tabs (Failure Clusters vs All Test Runs) */}
      <div className="flex items-center justify-between border-b border-[#20202a] pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('clusters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'clusters'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'bg-[#1a1a22] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
          >
            <i className="fas fa-layer-group"></i>
            <span>Failure Clusters (Triage)</span>
            {hasFailures && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                viewMode === 'clusters' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'
              }`}>
                {failureClustersData.clusters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'all'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'bg-[#1a1a22] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
          >
            <i className="fas fa-list-check"></i>
            <span>All Test Runs</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              viewMode === 'all' ? 'bg-white/20 text-white' : 'bg-[#0e0e13] text-[#9a9aa5]'
            }`}>
              {safeTestRuns.length}
            </span>
          </button>
        </div>

        {viewMode === 'clusters' && hasFailures && (
          <p className="text-xs text-[#9a9aa5] hidden sm:block">
            Grouped by root-cause exception & normalized error patterns
          </p>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'clusters' ? (
        <FailureClusterViewer
          clusters={failureClustersData.clusters}
          stats={failureClustersData.stats}
          onRefresh={fetchDetails}
        />
      ) : (
        /* Test Runs Filter & List Table */
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden shadow-none">
          <div className="p-5 border-b border-[#20202a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#f4f4f7]">Executed Test Runs</h3>
              <p className="text-xs text-[#9a9aa5]">Click on any test run to inspect deep granular step details</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Filter Pills */}
              <div className="flex items-center space-x-1 bg-[#0e0e13] p-1 rounded-xl border border-[#20202a]">
                {['all', 'passed', 'failed', 'flaky', 'skipped'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      statusFilter === status
                        ? 'bg-[#3b82f6] text-white'
                        : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search by test name or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] w-full sm:w-64"
              />
            </div>
          </div>

        {filteredTests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0e0e13]/60 border-b border-[#20202a] text-xs font-semibold text-[#9a9aa5]">
                <tr>
                  <th className="px-5 py-3">Test Title / Name</th>
                  <th className="px-5 py-3">Spec File</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Granular Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20202a] text-sm">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-[#20202a]/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#f4f4f7]">
                      <Link
                        to={`/tests/${test.id}`}
                        className="hover:text-[#3b82f6] transition-colors flex items-center gap-2"
                      >
                        <i className="fas fa-file-code text-xs text-[#5e5e68]"></i>
                        <span>{test.title || test.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#9a9aa5] font-mono">{test.file || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-[#9a9aa5] font-mono">{test.duration}ms</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          test.status === 'passed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : test.status === 'failed'
                            ? 'bg-red-500/10 text-red-400'
                            : test.status === 'flaky'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {test.status === 'failed' && (
                          <Link
                            to={`/tests/${test.id}?tab=stacktrace`}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                          >
                            <i className="fas fa-bug text-[10px]"></i> View Stack Trace
                          </Link>
                        )}
                        <Link
                          to={`/tests/${test.id}?tab=steps`}
                          className="px-3 py-1.5 bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/50 rounded-lg text-xs font-semibold text-[#3b82f6] transition-colors inline-flex items-center gap-1.5"
                        >
                          Inspect Details <i className="fas fa-arrow-right text-[10px]"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-[#9a9aa5]">
            No test runs match your filter or search criteria.
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default BuildDetails;
