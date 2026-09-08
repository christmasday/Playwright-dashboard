import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import { ByosConfig, StoragePolicyItem, StorageStats } from '../../types/api';
import CustomTimeframeModal from './CustomTimeframeModal';
import ByosConfigModal from './ByosConfigModal';

interface StorageRetentionTableProps {
  projectId?: string | null;
  onPolicyChange?: (policy: StoragePolicyItem) => void;
}

interface CategoryRow {
  key: keyof StoragePolicyItem;
  label: string;
  description: string;
  starter: string;
  team: string;
  defaultDays: number;
}

const CATEGORIES: CategoryRow[] = [
  {
    key: 'artifacts_passed_days',
    label: 'Artifacts (Passed Tests)',
    description: 'Screenshots, video recordings, and traces captured during successful test runs.',
    starter: '7 days',
    team: '7 days',
    defaultDays: 7,
  },
  {
    key: 'artifacts_failed_days',
    label: 'Artifacts (Failed, Flaky or Quarantined Tests)',
    description: 'Critical debugging assets including failure screenshots, trace archives, and video replays.',
    starter: '21 days',
    team: '21 days',
    defaultDays: 21,
  },
  {
    key: 'test_results_days',
    label: 'Test Results',
    description: 'High-level test execution outcomes, error assertions, timestamps, and pass/fail statuses.',
    starter: '90 days',
    team: '90 days',
    defaultDays: 90,
  },
  {
    key: 'test_details_days',
    label: 'Test Details',
    description: 'Granular step-by-step test execution tree, terminal outputs, and HTTP network requests.',
    starter: '30 days',
    team: '30 days',
    defaultDays: 30,
  },
  {
    key: 'reports_analytics_days',
    label: 'Reports & Analytics',
    description: 'Aggregated cross-build metrics, flaky score trends, execution duration percentiles, and CI histories.',
    starter: '365 days',
    team: '365 days',
    defaultDays: 365,
  },
];

export const StorageRetentionTable: React.FC<StorageRetentionTableProps> = ({
  projectId = null,
  onPolicyChange,
}) => {
  const [policy, setPolicy] = useState<StoragePolicyItem>({
    artifacts_passed_days: 7,
    artifacts_failed_days: 21,
    test_results_days: 90,
    test_details_days: 30,
    reports_analytics_days: 365,
    byos_enabled: false,
    byos_provider: 's3',
    byos_config: {},
    auto_purge_enabled: true,
  });

  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cleanupReport, setCleanupReport] = useState<any | null>(null);

  // Modals state
  const [activeCategoryModal, setActiveCategoryModal] = useState<CategoryRow | null>(null);
  const [byosModalOpen, setByosModalOpen] = useState(false);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const res = await apiService.getStoragePolicy({ projectId: projectId || undefined });
      const data = res.data?.data;
      if (data?.policy) {
        setPolicy(data.policy);
        if (onPolicyChange) onPolicyChange(data.policy);
      }
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Failed to load storage policy', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, [projectId]);

  const handleSaveCategoryDays = (days: number | null) => {
    if (!activeCategoryModal) return;
    const key = activeCategoryModal.key;
    const updatedPolicy = {
      ...policy,
      [key]: days,
    };
    setPolicy(updatedPolicy);
    handlePersistPolicy(updatedPolicy);
  };

  const handleSaveByos = (byosData: { byosEnabled: boolean; config: ByosConfig }) => {
    const updatedPolicy = {
      ...policy,
      byos_enabled: byosData.byosEnabled,
      byos_config: byosData.config,
      byos_provider: byosData.config.provider || 's3',
    };
    setPolicy(updatedPolicy);
    handlePersistPolicy(updatedPolicy);
  };

  const handlePersistPolicy = async (policyToSave = policy) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await apiService.saveStoragePolicy({
        projectId,
        ...policyToSave,
      });
      setStatusMessage({
        type: 'success',
        text: 'Custom storage timeframe & retention policy saved successfully.',
      });
      if (res.data?.data) {
        setPolicy(res.data.data);
        if (onPolicyChange) onPolicyChange(res.data.data);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Failed to save storage policy',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTriggerCleanup = async (dryRun = false) => {
    setCleaning(true);
    setCleanupReport(null);
    try {
      const res = await apiService.runRetentionCleanup({ dryRun, projectId });
      setCleanupReport(res.data?.data);
      setStatusMessage({
        type: 'success',
        text: dryRun
          ? `Dry-run completed: ${res.data?.data?.purgedArtifactsCount || 0} expired artifacts eligible for pruning.`
          : `Retention cleanup executed: Purged ${res.data?.data?.purgedArtifactsCount || 0} artifacts, freed ${res.data?.data?.freedMegabytes || 0} MB.`,
      });
      // Refresh stats
      loadPolicy();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to execute retention cleanup',
      });
    } finally {
      setCleaning(false);
    }
  };

  const formatCustomBadge = (days: number | null, defaultDays: number) => {
    if (days === null) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
          <span>Custom (Unlimited)</span>
          <i className="fas fa-pen text-[10px] opacity-70"></i>
        </span>
      );
    }

    const isCustomized = days !== defaultDays;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
          isCustomized
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm'
            : 'bg-[#15151c] text-[#f4f4f7] border-[#2b2b3b] hover:border-emerald-500/40 hover:text-emerald-400'
        }`}
      >
        <span>{isCustomized ? `Custom (${days}d)` : 'Custom'}</span>
        <i className="fas fa-pen text-[10px] text-[#9a9aa5]"></i>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#15151c] border border-[#20202a] rounded-2xl p-8 text-center text-[#9a9aa5] space-y-3 shadow-xl">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-medium">Loading storage retention configuration…</p>
      </div>
    );
  }

  return (
    <div className="bg-[#15151c] border border-[#20202a] rounded-2xl shadow-xl overflow-hidden">
      {/* Header matching exact user screenshot */}
      <div className="px-6 py-5 border-b border-[#20202a] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6M9 15h6"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-[#f4f4f7]">Storage</h2>
              {saving && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <i className="fas fa-spinner fa-spin"></i> Saving...
                </span>
              )}
            </div>
            <p className="text-xs text-[#9a9aa5] mt-0.5">Data retention and storage options.</p>
          </div>
        </div>

        <Link
          to="/docs"
          className="px-4 py-1.5 bg-[#142820] hover:bg-[#1a382c] border border-[#23533e] text-emerald-400 font-semibold text-xs rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span>Docs</span>
        </Link>
      </div>

      {statusMessage && (
        <div
          className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 border animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <i
            className={`fas ${
              statusMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'
            } text-sm`}
          ></i>
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Retention Table matching user screenshot */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#20202a] text-[#6e6e80] text-[11px] font-semibold">
              <th className="py-3 px-6 font-medium">Category</th>
              <th className="py-3 px-6 text-center font-medium">Starter</th>
              <th className="py-3 px-6 text-center font-medium">Team</th>
              <th className="py-3 px-6 text-right font-medium">Custom Timeframe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#20202a]">
            {CATEGORIES.map((cat) => {
              const currentDays = (policy as any)[cat.key];
              return (
                <tr
                  key={cat.key}
                  className="hover:bg-[#181822] transition-colors group cursor-pointer"
                  onClick={() => setActiveCategoryModal(cat)}
                  title={`Click to adjust custom timeframe for ${cat.label}`}
                >
                  <td className="py-4 px-6 text-[#f4f4f7] font-medium max-w-sm">
                    <div className="flex items-center gap-2">
                      <span>{cat.label}</span>
                      <i className="fas fa-circle-info text-[11px] text-[#4d4d5e] group-hover:text-[#9a9aa5] transition-colors"></i>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center text-[#9a9aa5] font-mono">
                    {cat.starter}
                  </td>
                  <td className="py-4 px-6 text-center text-[#9a9aa5] font-mono">
                    {cat.team}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategoryModal(cat);
                      }}
                    >
                      {formatCustomBadge(currentDays, cat.defaultDays)}
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Row 6: Bring Your Own Storage */}
            <tr
              className="hover:bg-[#181822] transition-colors group cursor-pointer"
              onClick={() => setByosModalOpen(true)}
              title="Click to configure Bring Your Own Storage credentials"
            >
              <td className="py-4 px-6 text-[#f4f4f7] font-medium">
                <div className="flex items-center gap-2">
                  <span>Bring Your Own Storage</span>
                  <i
                    className="fas fa-circle-info text-[11px] text-[#4d4d5e] group-hover:text-teal-400 transition-colors"
                    title="Connect your own AWS S3, Cloudflare R2, MinIO, or GCS bucket"
                  ></i>
                </div>
              </td>
              <td className="py-4 px-6 text-center text-[#6e6e80] font-mono">—</td>
              <td className="py-4 px-6 text-center text-[#6e6e80] font-mono">—</td>
              <td className="py-4 px-6 text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setByosModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    policy.byos_enabled
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20 shadow-sm'
                      : 'bg-[#15151c] text-[#9a9aa5] border-[#2b2b3b] hover:border-teal-500/40 hover:text-teal-400'
                  }`}
                >
                  {policy.byos_enabled ? (
                    <>
                      <i className="fas fa-check text-xs text-teal-400"></i>
                      <span className="capitalize">{policy.byos_config?.bucket ? policy.byos_config.bucket : 'Active'}</span>
                    </>
                  ) : (
                    <>
                      <span>Configure</span>
                      <i className="fas fa-gear text-[10px]"></i>
                    </>
                  )}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stats and Action Bar */}
      <div className="p-6 bg-[#121218] border-t border-[#20202a] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {stats ? (
          <div className="flex items-center gap-4 text-xs text-[#9a9aa5] flex-wrap">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-database text-emerald-400"></i>
              <span>Total Artifacts:</span>
              <strong className="text-[#f4f4f7] font-mono">
                {stats.totalArtifacts} ({(stats.totalBytes / (1024 * 1024)).toFixed(1)} MB)
              </strong>
            </div>

            {stats.expiredCandidates && stats.expiredCandidates.totalEligibleForCleanup > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                <i className="fas fa-broom text-xs"></i>
                <span>{stats.expiredCandidates.totalEligibleForCleanup} expired items eligible for cleanup</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#6e6e80]">Automatic cleanup executes every 24h</div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleTriggerCleanup(true)}
            disabled={cleaning}
            title="Simulate retention cleanup without deleting files"
            className="px-3.5 py-1.5 bg-[#1c1c27] hover:bg-[#252535] text-xs font-semibold text-[#9a9aa5] hover:text-[#f4f4f7] rounded-xl transition-colors border border-[#2b2b3b] disabled:opacity-50"
          >
            <i className={`fas fa-eye text-xs mr-1.5 ${cleaning ? 'fa-spin' : ''}`}></i>
            <span>Dry-Run Check</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerCleanup(false)}
            disabled={cleaning}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fas ${cleaning ? 'fa-spinner fa-spin' : 'fa-broom'} text-xs`}></i>
            <span>{cleaning ? 'Pruning...' : 'Run Cleanup Now'}</span>
          </button>
        </div>
      </div>

      {cleanupReport && (
        <div className="px-6 py-4 bg-[#0e0e13] border-t border-[#20202a] text-xs text-[#9a9aa5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#f4f4f7] font-semibold">Last Execution Result:</span>
            <span>
              Purged <strong className="text-emerald-400 font-mono">{cleanupReport.purgedArtifactsCount}</strong> artifacts (Passed: {cleanupReport.purgedPassedArtifacts}, Failed: {cleanupReport.purgedFailedArtifacts})
            </span>
            <span>•</span>
            <span>Freed <strong className="text-emerald-400 font-mono">{cleanupReport.freedMegabytes} MB</strong></span>
          </div>
          <span className="text-[11px] font-mono text-[#6e6e80]">
            Latency: {cleanupReport.durationMs}ms
          </span>
        </div>
      )}

      {/* Category Custom Timeframe Modal */}
      {activeCategoryModal && (
        <CustomTimeframeModal
          isOpen={!!activeCategoryModal}
          onClose={() => setActiveCategoryModal(null)}
          categoryKey={activeCategoryModal.key}
          categoryLabel={activeCategoryModal.label}
          currentDays={(policy as any)[activeCategoryModal.key]}
          defaultDays={activeCategoryModal.defaultDays}
          onSave={handleSaveCategoryDays}
        />
      )}

      {/* BYOS Configuration Modal */}
      {byosModalOpen && (
        <ByosConfigModal
          isOpen={byosModalOpen}
          onClose={() => setByosModalOpen(false)}
          byosEnabled={policy.byos_enabled}
          config={policy.byos_config || {}}
          onSave={handleSaveByos}
        />
      )}
    </div>
  );
};

export default StorageRetentionTable;
