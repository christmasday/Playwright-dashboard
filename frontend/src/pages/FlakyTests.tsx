import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import Pagination from '../components/Common/Pagination';

interface FlakyTestItem {
  id: string;
  test_name: string;
  file?: string;
  flakiness_score: number;
  failure_count: number;
  total_runs: number;
  pass_count?: number;
  retry_count?: number;
  failure_category?: string;
  last_error_message?: string;
  quarantine_status: 'active' | 'quarantined' | 'resolved';
  last_seen?: string;
  notes?: string;
  quarantined_by?: string;
}

interface SummaryData {
  totalFlakyTests: number;
  averageScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  quarantinedCount: number;
  resolvedCount: number;
  categories: { category: string; count: number }[];
}

const FlakyTests: React.FC = () => {
  const [tests, setTests] = useState<FlakyTestItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTests, setTotalTests] = useState(0);
  const [selectedTest, setSelectedTest] = useState<FlakyTestItem | null>(null);
  const [historyRuns, setHistoryRuns] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchFlakyData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [testsRes, summaryRes] = await Promise.all([
        apiService.getFlakyTests({
          status: statusFilter,
          severity: severityFilter,
          search: searchQuery,
          page,
          limit: pageSize,
        }),
        apiService.getFlakySummary(),
      ]);
      setTests(testsRes.data.tests || []);
      setTotalTests(testsRes.data.total ?? (testsRes.data.tests?.length || 0));
      setSummary(summaryRes.data.summary || null);
    } catch (error) {
      console.error('Error fetching flaky test data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlakyData();
  }, [severityFilter, statusFilter, searchQuery, page, pageSize]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await apiService.runFlakyAnalysis();
      setActionSuccessMsg(res.data.message || 'Analysis scan completed.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      await fetchFlakyData(true);
    } catch (error) {
      console.error('Error running analysis scan:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleQuarantine = async (id: string, currentStatus: string) => {
    const newStatus: 'active' | 'quarantined' = currentStatus === 'quarantined' ? 'active' : 'quarantined';

    // Optimistic UI update
    setTests((prevTests) =>
      prevTests.map((t) => (t.id === id ? { ...t, quarantine_status: newStatus } : t))
    );
    if (selectedTest && selectedTest.id === id) {
      setSelectedTest((prev) => (prev ? { ...prev, quarantine_status: newStatus } : null));
    }

    try {
      await apiService.updateFlakyQuarantine(id, newStatus, 'Status updated from dashboard');
      setActionSuccessMsg(`Test status updated to "${newStatus.toUpperCase()}"`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchFlakyData(true);
    } catch (error) {
      console.error('Error updating quarantine status:', error);
      await fetchFlakyData(true);
    }
  };

  const handleMarkResolved = async (id: string) => {
    // Optimistic UI update
    setTests((prevTests) =>
      prevTests.map((t) => (t.id === id ? { ...t, quarantine_status: 'resolved' } : t))
    );
    if (selectedTest && selectedTest.id === id) {
      setSelectedTest((prev) => (prev ? { ...prev, quarantine_status: 'resolved' } : null));
    }

    try {
      await apiService.updateFlakyQuarantine(id, 'resolved', 'Marked resolved by user');
      setActionSuccessMsg('Test marked as RESOLVED');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      await fetchFlakyData(true);
    } catch (error) {
      console.error('Error marking test resolved:', error);
      await fetchFlakyData(true);
    }
  };

  const handleSelectTest = async (testItem: FlakyTestItem) => {
    setSelectedTest(testItem);
    try {
      setHistoryLoading(true);
      const res = await apiService.getFlakyHistory(testItem.id);
      setHistoryRuns(res.data.runs || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'Element Timeout':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Assertion Failure':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Network Error':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Navigation Timeout':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'State Collision':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-[#20202a] text-[#9a9aa5] border-[#20202a]';
    }
  };

  const getSeverityBadge = (scoreInput: number | string) => {
    const score = typeof scoreInput === 'number' ? scoreInput : parseFloat(String(scoreInput || 0));
    const formatted = isNaN(score) ? '0.0' : score.toFixed(1);
    if (score > 50) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">High Risk ({formatted}%)</span>;
    }
    if (score >= 20) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Medium Risk ({formatted}%)</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">Low Risk ({formatted}%)</span>;
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-[#08080a] min-h-screen text-[#f4f4f7]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#20202a] pb-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-amber-400">
              <i className="fas fa-bug text-sm"></i>
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Flaky Test Analysis & Quarantine</h1>
          </div>
          <p className="text-xs text-[#9a9aa5]">
            Automated root-cause categorization, historical flakiness scoring, and quarantine management engine.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="px-4 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt ${analyzing ? 'fa-spin' : ''}`}></i>
          {analyzing ? 'Scanning Test Runs...' : 'Re-Run Analysis Scan'}
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <i className="fas fa-check-circle"></i> {actionSuccessMsg}
        </div>
      )}

      {/* Metrics Overview Bar */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#14141b] border border-[#20202a] rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Total Flaky Tests</span>
            <div className="text-2xl font-black text-[#f4f4f7]">{summary.totalFlakyTests}</div>
            <p className="text-[11px] text-[#9a9aa5]">Across all project test suites</p>
          </div>

          <div className="p-5 bg-[#14141b] border border-red-500/20 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">High Risk (&gt;50%)</span>
            <div className="text-2xl font-black text-red-400">{summary.highRiskCount}</div>
            <p className="text-[11px] text-[#9a9aa5]">Frequent retry failures</p>
          </div>

          <div className="p-5 bg-[#14141b] border border-amber-500/20 rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Quarantined</span>
            <div className="text-2xl font-black text-amber-400">{summary.quarantinedCount}</div>
            <p className="text-[11px] text-[#9a9aa5]">Isolated from blocking builds</p>
          </div>

          <div className="p-5 bg-[#14141b] border border-[#20202a] rounded-2xl space-y-1">
            <span className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">Avg Flakiness Index</span>
            <div className="text-2xl font-black text-[#3b82f6]">{summary.averageScore}%</div>
            <p className="text-[11px] text-[#9a9aa5]">Average failure weight</p>
          </div>
        </div>
      )}

      {/* Filters & Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#14141b] border border-[#20202a] p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e68] text-xs"></i>
            <input
              type="text"
              placeholder="Search tests or spec files..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5e5e68] hover:text-[#f4f4f7]"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-[#9a9aa5]">Filters:</span>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#08080a] border border-[#20202a] text-xs font-semibold text-[#f4f4f7] px-3 py-2 rounded-xl focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="all">All Severities</option>
            <option value="high">High Risk (&gt;50%)</option>
            <option value="medium">Medium Risk (20-50%)</option>
            <option value="low">Low Risk (&lt;20%)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#08080a] border border-[#20202a] text-xs font-semibold text-[#f4f4f7] px-3 py-2 rounded-xl focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Flaky</option>
            <option value="quarantined">Quarantined</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Flaky Tests Table & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table View */}
        <div className="lg:col-span-2 bg-[#14141b] border border-[#20202a] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-[#20202a] flex items-center justify-between bg-[#101017]">
              <h3 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <i className="fas fa-list text-[#3b82f6]"></i> Analyzed Flaky Tests
              </h3>
              <span className="text-xs text-[#9a9aa5] font-mono">
                {totalTests} total flaky tests
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#9a9aa5]">Loading flaky test analysis...</div>
            ) : tests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0e0e13] border-b border-[#20202a] text-[#9a9aa5] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Test Name & Spec File</th>
                      <th className="p-4">Root Cause Category</th>
                      <th className="p-4 text-center">Score</th>
                      <th className="p-4 text-center">Quarantine</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20202a] text-[#9a9aa5]">
                    {tests.map((test) => {
                      const isSelected = selectedTest && selectedTest.id === test.id;
                      return (
                        <tr
                          key={test.id}
                          onClick={() => handleSelectTest(test)}
                          className={`hover:bg-[#1c1c26] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#3b82f6]/10 border-l-4 border-l-[#3b82f6]' : ''
                          }`}
                        >
                          <td className="p-4 space-y-1">
                            <div className="font-semibold text-[#f4f4f7] line-clamp-1">{test.test_name}</div>
                            {test.file && <div className="font-mono text-[10px] text-[#9a9aa5]">{test.file}</div>}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getCategoryBadgeClass(
                                test.failure_category
                              )}`}
                            >
                              {test.failure_category || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-4 text-center">{getSeverityBadge(test.flakiness_score)}</td>
                          <td className="p-4 text-center">
                            {test.quarantine_status === 'quarantined' ? (
                              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-bold">
                                Quarantined
                              </span>
                            ) : test.quarantine_status === 'resolved' ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                                Resolved
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full font-bold">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleQuarantine(test.id, test.quarantine_status)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                test.quarantine_status === 'quarantined'
                                  ? 'bg-[#20202a] text-[#f4f4f7] border-[#30303f] hover:bg-[#252535]'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                            >
                              {test.quarantine_status === 'quarantined' ? 'Unquarantine' : 'Quarantine'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[#9a9aa5]">
                No flaky tests matching filter parameters.
              </div>
            )}
          </div>

          {/* Pagination Component */}
          {totalTests > pageSize && (
            <div className="p-4 border-t border-[#20202a] bg-[#101017]">
              <Pagination
                currentPage={page}
                totalItems={totalTests}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="flaky tests"
              />
            </div>
          )}
        </div>

        {/* Selected Test Detail Drawer / Analysis Panel */}
        <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6">
          {selectedTest ? (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4 space-y-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getCategoryBadgeClass(
                    selectedTest.failure_category
                  )}`}
                >
                  {selectedTest.failure_category || 'Unknown Failure'}
                </span>
                <h3 className="text-base font-bold text-[#f4f4f7] leading-snug">{selectedTest.test_name}</h3>
                {selectedTest.file && <p className="text-xs font-mono text-[#9a9aa5]">{selectedTest.file}</p>}
              </div>

              {/* Flakiness Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                  <span className="text-[#9a9aa5] text-[10px]">Passes</span>
                  <div className="font-bold text-emerald-400">{selectedTest.pass_count || 0}</div>
                </div>
                <div className="p-3 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                  <span className="text-[#9a9aa5] text-[10px]">Failures</span>
                  <div className="font-bold text-red-400">{selectedTest.failure_count || 0}</div>
                </div>
                <div className="p-3 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                  <span className="text-[#9a9aa5] text-[10px]">Total Runs</span>
                  <div className="font-bold text-[#f4f4f7]">{selectedTest.total_runs || 0}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleQuarantine(selectedTest.id, selectedTest.quarantine_status)}
                  className="flex-1 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500/20 transition-all"
                >
                  {selectedTest.quarantine_status === 'quarantined' ? 'Lift Quarantine' : 'Quarantine Test'}
                </button>
                <button
                  onClick={() => handleMarkResolved(selectedTest.id)}
                  className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/20 transition-all"
                >
                  Mark Resolved
                </button>
              </div>

              {/* Failure Error Message Log */}
              {selectedTest.last_error_message && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#f4f4f7]">Recent Stack Trace Error</h4>
                  <div className="p-3 bg-[#08080a] border border-[#20202a] rounded-xl font-mono text-[11px] text-red-400 overflow-x-auto max-h-40">
                    <pre className="whitespace-pre-wrap">{selectedTest.last_error_message}</pre>
                  </div>
                </div>
              )}

              {/* Historical Executions Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#f4f4f7]">Recent Execution Run History</h4>
                {historyLoading ? (
                  <div className="text-xs text-[#9a9aa5]">Loading execution history...</div>
                ) : historyRuns.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {historyRuns.map((run) => (
                      <div
                        key={run.id}
                        className="p-2.5 bg-[#08080a] border border-[#20202a] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              run.status === 'passed'
                                ? 'bg-emerald-400'
                                : run.status === 'failed'
                                ? 'bg-red-400'
                                : 'bg-amber-400'
                            }`}
                          ></span>
                          <span className="font-mono text-[#f4f4f7]">
                            Build #{run.build_number || 'N/A'}
                          </span>
                        </div>
                        <span className="text-[#9a9aa5] text-[10px]">
                          {(run.duration / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#9a9aa5]">No recent runs recorded.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#9a9aa5] space-y-2">
              <i className="fas fa-hand-pointer text-xl text-[#3b82f6]"></i>
              <p>Select any test from the list to view failure root-cause analysis, history timeline, and quarantine actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlakyTests;
