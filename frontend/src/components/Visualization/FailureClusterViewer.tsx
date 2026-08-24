/**
 * Automated Failure Clustering & Triage Viewer
 * Groups failed tests sharing the same root-cause error into clusters for fast triage.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FailureCluster, ClusterSummaryStats } from '../../utils/failureClusterer';
import StackTraceModal from './StackTraceModal';
import apiService from '../../services/api';

interface FailureClusterViewerProps {
  clusters: FailureCluster[];
  stats: ClusterSummaryStats;
  onRefresh?: () => void;
}

const FailureClusterViewer: React.FC<FailureClusterViewerProps> = ({
  clusters,
  stats,
  onRefresh,
}) => {
  const [expandedClusterIds, setExpandedClusterIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (clusters.length > 0) {
      initial[clusters[0].id] = true; // Auto-expand the dominant/first cluster
    }
    return initial;
  });

  const [activeTraceModal, setActiveTraceModal] = useState<{
    isOpen: boolean;
    error: { message: string; stack?: string; location?: string };
    title: string;
  }>({
    isOpen: false,
    error: { message: '' },
    title: '',
  });

  const [quarantiningId, setQuarantiningId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedClusterIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenStackTrace = (cluster: FailureCluster) => {
    setActiveTraceModal({
      isOpen: true,
      error: {
        message: cluster.normalizedError,
        stack: cluster.commonStackTrace || `Error: ${cluster.normalizedError}`,
        location: cluster.failingLocation,
      },
      title: `Cluster: ${cluster.headline}`,
    });
  };

  const handleQuarantineCluster = async (cluster: FailureCluster) => {
    const reason = `Auto-quarantined via failure cluster: ${cluster.headline}`;
    if (!window.confirm(`Quarantine all ${cluster.affectedCount} tests in this cluster?\n\n"${cluster.headline}"`)) {
      return;
    }

    try {
      setQuarantiningId(cluster.id);
      await Promise.all(
        cluster.tests.map((t) =>
          apiService.updateTestStatus(t.id, { status: 'quarantined', quarantineReason: reason }).catch(() => null)
        )
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error quarantining cluster tests:', err);
    } finally {
      setQuarantiningId(null);
    }
  };

  if (clusters.length === 0) {
    return (
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 text-center text-[#9a9aa5]">
        <i className="fas fa-check-circle text-emerald-400 text-3xl mb-3"></i>
        <h4 className="text-base font-bold text-[#f4f4f7]">No Test Failures Detected</h4>
        <p className="text-xs text-[#9a9aa5] mt-1">All tests in this build passed successfully without errors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Triage Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Total Failed Tests</p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">{stats.totalFailedTests}</p>
          </div>
          <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center text-lg">
            <i className="fas fa-times-circle"></i>
          </span>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Unique Failure Clusters</p>
            <p className="text-2xl font-extrabold text-[#3b82f6] mt-1">{stats.totalClusters}</p>
          </div>
          <span className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center text-lg">
            <i className="fas fa-layer-group"></i>
          </span>
        </div>

        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Top Root Cause</p>
            <p className="text-sm font-bold text-amber-400 mt-1 truncate max-w-[200px]" title={stats.dominantClusterName}>
              {stats.dominantClusterName || 'N/A'}
            </p>
            {stats.dominantClusterPercentage !== undefined && (
              <p className="text-[11px] text-[#9a9aa5]">{stats.dominantClusterPercentage}% of all failures</p>
            )}
          </div>
          <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg">
            <i className="fas fa-chart-pie"></i>
          </span>
        </div>
      </div>

      {/* Cluster Cards List */}
      <div className="space-y-4">
        {clusters.map((cluster, index) => {
          const isExpanded = !!expandedClusterIds[cluster.id];
          const isQuarantining = quarantiningId === cluster.id;

          return (
            <div
              key={cluster.id}
              className={`bg-[#1a1a22] border rounded-xl overflow-hidden transition-all shadow-lg ${
                isExpanded ? 'border-[#3b82f6]/50' : 'border-[#20202a]'
              }`}
            >
              {/* Cluster Header */}
              <div
                onClick={() => toggleExpand(cluster.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#20202a]/30 transition-colors select-none"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-[#5e5e68] font-mono">
                      #{index + 1}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border flex items-center gap-1.5 ${cluster.categoryBadgeClass}`}>
                      <i className={`fas ${cluster.categoryIcon} text-[10px]`}></i>
                      {cluster.categoryLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      {cluster.affectedCount} {cluster.affectedCount === 1 ? 'test' : 'tests'} affected ({cluster.affectedPercentage}%)
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#f4f4f7] truncate">
                    {cluster.headline}
                  </h3>

                  {cluster.affectedSpecFiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-[#5e5e68]">Spec Files:</span>
                      {cluster.affectedSpecFiles.map((file) => (
                        <span
                          key={file}
                          className="px-2 py-0.5 bg-[#0e0e13] border border-[#20202a] rounded text-[11px] font-mono text-[#60a5fa] truncate max-w-xs"
                          title={file}
                        >
                          {file.split(/[\\/]/).pop()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenStackTrace(cluster)}
                    className="px-3 py-1.5 bg-[#0e0e13] hover:bg-[#20202a] text-[#60a5fa] border border-[#3b82f6]/30 hover:border-[#3b82f6]/60 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    title="View common stack trace & diagnostics"
                  >
                    <i className="fas fa-bug text-[10px]"></i> View Stack Trace
                  </button>

                  <button
                    onClick={() => handleQuarantineCluster(cluster)}
                    disabled={isQuarantining}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Batch quarantine all tests in this cluster"
                  >
                    <i className={`fas fa-${isQuarantining ? 'spinner fa-spin' : 'shield-alt'} text-[10px]`}></i>
                    {isQuarantining ? 'Quarantining...' : 'Quarantine Cluster'}
                  </button>

                  <button
                    onClick={() => toggleExpand(cluster.id)}
                    className="w-8 h-8 rounded-xl bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#9a9aa5] hover:text-[#f4f4f7] flex items-center justify-center text-xs transition-colors"
                  >
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>

              {/* Cluster Expandable Content */}
              {isExpanded && (
                <div className="border-t border-[#20202a] bg-[#121218] p-5 space-y-5">
                  {/* Debugging Advice */}
                  {cluster.rootCauseAdvice && (
                    <div className="p-3.5 bg-[#0e0e13] border border-[#20202a] rounded-xl flex items-start gap-3 text-xs">
                      <i className="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0 text-sm"></i>
                      <div>
                        <strong className="text-[#f4f4f7] font-semibold">Triage & Fix Advice: </strong>
                        <span className="text-[#9a9aa5] leading-relaxed">{cluster.rootCauseAdvice}</span>
                      </div>
                    </div>
                  )}

                  {/* Common Error Block */}
                  <div>
                    <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider mb-2">
                      Normalized Failure Signature
                    </h4>
                    <div className="p-4 bg-[#08080a] border border-red-500/20 rounded-xl overflow-x-auto">
                      <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all leading-relaxed">
                        {cluster.normalizedError}
                      </pre>
                    </div>
                  </div>

                  {/* List of Impacted Tests Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider">
                        Impacted Tests ({cluster.tests.length})
                      </h4>
                      <span className="text-xs text-[#5e5e68]">
                        Click "Inspect Details" to view granular execution steps
                      </span>
                    </div>

                    <div className="border border-[#20202a] rounded-xl overflow-hidden bg-[#0e0e13]">
                      <table className="w-full text-left">
                        <thead className="bg-[#14141b] border-b border-[#20202a] text-[11px] font-semibold text-[#9a9aa5] uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Test Case Name</th>
                            <th className="px-4 py-2.5">Spec File</th>
                            <th className="px-4 py-2.5">Duration</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#20202a] text-xs">
                          {cluster.tests.map((test) => (
                            <tr key={test.id} className="hover:bg-[#1a1a24] transition-colors">
                              <td className="px-4 py-3 font-semibold text-[#f4f4f7]">
                                <Link
                                  to={`/tests/${test.id}?tab=steps`}
                                  className="hover:text-[#3b82f6] transition-colors flex items-center gap-2"
                                >
                                  <i className="fas fa-file-code text-[#5e5e68] text-xs"></i>
                                  <span>{test.title || test.name}</span>
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-[#9a9aa5] font-mono text-[11px]">
                                {test.file || '—'}
                              </td>
                              <td className="px-4 py-3 text-[#9a9aa5] font-mono text-[11px]">
                                {test.duration}ms
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  to={`/tests/${test.id}?tab=steps`}
                                  className="px-2.5 py-1 bg-[#1a1a24] hover:bg-[#252535] text-[#3b82f6] border border-[#20202a] rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                                >
                                  Inspect Details <i className="fas fa-arrow-right text-[9px]"></i>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Common Stack Trace Modal */}
      <StackTraceModal
        isOpen={activeTraceModal.isOpen}
        onClose={() => setActiveTraceModal((prev) => ({ ...prev, isOpen: false }))}
        error={activeTraceModal.error}
        testTitle={activeTraceModal.title}
      />
    </div>
  );
};

export default FailureClusterViewer;
