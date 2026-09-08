import React, { useState } from 'react';
import { IssueLink } from '../../types/api';

interface LinkedIssuesBadgeProps {
  issues: IssueLink[];
  onSync: (id: string) => Promise<void>;
  onUnlink?: (id: string) => Promise<void>;
  onOpenCreateModal?: () => void;
  compact?: boolean;
  loading?: boolean;
}

export const LinkedIssuesBadge: React.FC<LinkedIssuesBadgeProps> = ({
  issues,
  onSync,
  onUnlink,
  onOpenCreateModal,
  compact = false,
  loading = false,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSync = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingId(id);
    setSyncMessage(null);
    try {
      await onSync(id);
      setSyncMessage('Status updated');
      setTimeout(() => setSyncMessage(null), 2500);
    } catch (err: any) {
      setSyncMessage(err?.response?.data?.error || 'Sync failed');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setSyncingId(null);
    }
  };

  const handleUnlink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnlink) return;
    if (window.confirm('Unlink this issue from this test? The external ticket will NOT be deleted.')) {
      try {
        await onUnlink(id);
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Unlink failed');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('close') || s.includes('done') || s.includes('resolved')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    if (s.includes('progress') || s.includes('review') || s.includes('in dev')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (s.includes('open') || s.includes('to do') || s.includes('new')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  if (compact) {
    if (issues.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {issues.map((issue) => (
          <a
            key={issue.id}
            href={issue.issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#15151c] hover:bg-[#1f1f2a] border border-[#2b2b3b] rounded-lg text-xs font-mono text-[#f4f4f7] transition-all hover:border-[#3b82f6]/50 shadow-sm"
            title={`${issue.provider.toUpperCase()}: ${issue.issue_title} (${issue.issue_status})`}
          >
            <i
              className={`text-xs ${
                issue.provider === 'jira'
                  ? 'fa-brands fa-jira text-[#0052cc]'
                  : 'fa-brands fa-github text-[#f4f4f7]'
              }`}
            ></i>
            <span className="font-semibold">{issue.issue_key}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${getStatusColor(
                issue.issue_status
              )}`}
            >
              {issue.issue_status}
            </span>
            <i className="fas fa-arrow-up-right-from-square text-[10px] text-[#9a9aa5]"></i>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20202a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0e0e13] border border-[#262635] flex items-center justify-center text-[#3b82f6]">
            <i className="fas fa-ticket text-sm"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
              <span>Linked Issue Tracker Tickets</span>
              {loading ? (
                <i className="fas fa-spinner fa-spin text-xs text-[#3b82f6]"></i>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#2b2b3b] text-[#9a9aa5]">
                  {issues.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#9a9aa5]">
              Real-time sync with Jira Software and GitHub Issues
            </p>
          </div>
        </div>

        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Create Issue</span>
          </button>
        )}
      </div>

      {syncMessage && (
        <div className="mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-lg flex items-center gap-2 animate-fadeIn">
          <i className="fas fa-info-circle"></i>
          <span>{syncMessage}</span>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="text-center py-6 px-4 bg-[#121218] rounded-xl border border-dashed border-[#262635]">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#1b1b26] flex items-center justify-center text-[#6e6e80]">
            <i className="fas fa-link-slash text-base"></i>
          </div>
          <p className="text-xs font-medium text-[#f4f4f7] mb-1">No issues linked yet</p>
          <p className="text-xs text-[#9a9aa5] max-w-sm mx-auto mb-3">
            Push this failure directly to Jira or GitHub with full stack traces, spec details, and AI root cause.
          </p>
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-1.5 bg-[#252535] hover:bg-[#303045] text-xs font-semibold text-[#f4f4f7] rounded-lg transition-colors border border-[#37374d] inline-flex items-center gap-1.5"
            >
              <i className="fas fa-bolt text-amber-400 text-xs"></i>
              <span>1-Click Issue Sync</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {issues.map((issue) => {
            const isSyncing = syncingId === issue.id;
            return (
              <div
                key={issue.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#121218] hover:bg-[#161620] border border-[#252533] rounded-xl transition-colors gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      issue.provider === 'jira'
                        ? 'bg-[#0052cc]/10 text-[#2684ff] border border-[#0052cc]/30'
                        : 'bg-white/5 text-[#f4f4f7] border border-white/10'
                    }`}
                  >
                    <i
                      className={`text-base ${
                        issue.provider === 'jira' ? 'fa-brands fa-jira' : 'fa-brands fa-github'
                      }`}
                    ></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={issue.issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-[#3b82f6] hover:underline flex items-center gap-1"
                      >
                        <span>{issue.issue_key}</span>
                        <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
                      </a>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(
                          issue.issue_status
                        )}`}
                      >
                        {issue.issue_status}
                      </span>
                      <span className="text-[10px] text-[#6e6e80] capitalize">
                        {issue.provider}
                      </span>
                    </div>
                    <p
                      className="text-xs text-[#f4f4f7] font-medium mt-1 truncate max-w-lg"
                      title={issue.issue_title}
                    >
                      {issue.issue_title}
                    </p>
                    {issue.last_synced_at && (
                      <p className="text-[10px] text-[#6e6e80] mt-0.5">
                        Last synced: {new Date(issue.last_synced_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    aria-label="Refresh issue status"
                    onClick={(e) => handleSync(issue.id, e)}
                    disabled={isSyncing}
                    title="Refresh live status from external tracker"
                    className="px-2.5 py-1.5 bg-[#1e1e2b] hover:bg-[#28283a] text-xs font-medium text-[#9a9aa5] hover:text-[#f4f4f7] rounded-lg transition-colors border border-[#2b2b3d] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <i className={`fas fa-arrows-rotate text-xs ${isSyncing ? 'fa-spin text-[#3b82f6]' : ''}`}></i>
                    <span className="text-[11px]">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <a
                    href={issue.issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-[#1e1e2b] hover:bg-[#28283a] text-xs font-medium text-[#9a9aa5] hover:text-[#f4f4f7] rounded-lg transition-colors border border-[#2b2b3d] flex items-center gap-1"
                    title="View issue in external platform"
                  >
                    <i className="fas fa-external-link-alt text-xs"></i>
                  </a>

                  {onUnlink && (
                    <button
                      onClick={(e) => handleUnlink(issue.id, e)}
                      title="Unlink from this test"
                      className="p-1.5 text-[#6e6e80] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LinkedIssuesBadge;
