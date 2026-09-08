/**
 * Alerts & Notifications Management Page
 * Configure real-time Slack, Microsoft Teams, and Discord webhook integrations.
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import AlertDestinationModal from '../components/Alerts/AlertDestinationModal';
import AlertDeliveryLogsDrawer from '../components/Alerts/AlertDeliveryLogsDrawer';
import type { AlertDestination, AlertProvider, AlertDeliveryLog, Project } from '../types/api';

const PROVIDER_METADATA: Record<AlertProvider, { name: string; icon: string; brandColor: string; bgBadge: string }> = {
  slack: {
    name: 'Slack',
    icon: 'fab fa-slack',
    brandColor: '#36C5F0',
    bgBadge: 'bg-[#4A154B]/20 text-[#36C5F0] border-[#4A154B]/40',
  },
  teams: {
    name: 'Microsoft Teams',
    icon: 'fab fa-microsoft',
    brandColor: '#6264A7',
    bgBadge: 'bg-[#6264A7]/20 text-[#a5b4fc] border-[#6264A7]/40',
  },
  discord: {
    name: 'Discord',
    icon: 'fab fa-discord',
    brandColor: '#5865F2',
    bgBadge: 'bg-[#5865F2]/20 text-[#93c5fd] border-[#5865F2]/40',
  },
  webhook: {
    name: 'Webhook',
    icon: 'fas fa-link',
    brandColor: '#3b82f6',
    bgBadge: 'bg-[#3b82f6]/20 text-[#60a5fa] border-[#3b82f6]/40',
  },
};

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  failures_only: { label: 'Failures Only', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  all: { label: 'All Builds', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  status_change: { label: 'Status Changes', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
};

const AlertSettings: React.FC = () => {
  const [destinations, setDestinations] = useState<AlertDestination[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<AlertDestination | null>(null);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState<AlertDeliveryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Status feedback banners
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const [destResp, projResp] = await Promise.all([
        apiService.listAlertDestinations(),
        apiService.listProjects({ limit: 100 }),
      ]);
      setDestinations(destResp.data?.data || []);
      setProjects(projResp.data?.data || projResp.data?.projects || []);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to load alert channels.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const resp = await apiService.getAlertDeliveryLogs({ limit: 50 });
      setDeliveryLogs(resp.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load alert logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const handleToggleEnabled = async (dest: AlertDestination) => {
    const newEnabled = !dest.enabled;
    try {
      await apiService.updateAlertDestination(dest.id, { enabled: newEnabled });
      setDestinations((prev) =>
        prev.map((d) => (d.id === dest.id ? { ...d, enabled: newEnabled } : d))
      );
      setStatusMessage({
        type: 'success',
        text: `Alert channel "${dest.name}" ${newEnabled ? 'enabled' : 'muted'}.`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to update channel status.',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the alert destination "${name}"?`)) {
      return;
    }

    try {
      await apiService.deleteAlertDestination(id);
      setDestinations((prev) => prev.filter((d) => d.id !== id));
      setStatusMessage({
        type: 'success',
        text: `Alert destination "${name}" deleted.`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to delete alert destination.',
      });
    }
  };

  const handleTestDestination = async (dest: AlertDestination) => {
    setTestingId(dest.id);
    try {
      const resp = await apiService.testAlertDestination({
        destinationId: dest.id,
      });

      if (resp.data?.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Test notification successfully delivered to ${dest.name}!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: resp.data?.error || 'Failed to deliver test alert.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Webhook test request failed.',
      });
    } finally {
      setTestingId(null);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  // Mask webhook URL for security (show only domain and last 6 chars)
  const maskUrl = (url: string) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const end = url.slice(-6);
      return `${parsed.protocol}//${parsed.hostname}/...${end}`;
    } catch {
      return url.length > 28 ? `${url.substring(0, 20)}...${url.slice(-6)}` : url;
    }
  };

  // Filtered destinations
  const filtered = destinations.filter((d) => {
    if (selectedProvider !== 'all' && d.provider !== selectedProvider) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(query);
      const matchProject = d.project_name?.toLowerCase().includes(query);
      if (!matchName && !matchProject) return false;
    }
    return true;
  });

  const slackCount = destinations.filter((d) => d.provider === 'slack').length;
  const teamsCount = destinations.filter((d) => d.provider === 'teams').length;
  const discordCount = destinations.filter((d) => d.provider === 'discord').length;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-[#08080a] min-h-screen text-[#f4f4f7]">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#20202a] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-bell text-lg"></i>
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[#f4f4f7]">Alerts & Integrations</h1>
              <p className="text-xs text-[#9a9aa5]">
                Real-time test notifications, regression alerts & AI diagnostics across your team channels
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              loadLogs();
              setLogsDrawerOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#9a9aa5] hover:text-[#f4f4f7] transition-colors flex items-center gap-2"
          >
            <i className="fas fa-history text-xs text-[#3b82f6]"></i>
            Delivery Logs
          </button>

          <button
            onClick={() => {
              setEditingDestination(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-[#3b82f6]/10"
          >
            <i className="fas fa-plus text-xs"></i>
            Add Integration
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <i className={`fas fa-${statusMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[#9a9aa5] hover:text-[#f4f4f7]">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Slack Card */}
        <div className="bg-[#14141b] border border-[#20202a] hover:border-[#4A154B]/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#4A154B]/20 border border-[#4A154B]/40 flex items-center justify-center text-[#36C5F0] text-xl">
                  <i className="fab fa-slack"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#f4f4f7]">Slack</h3>
                  <p className="text-[11px] text-[#9a9aa5]">Interactive Block Kit alerts</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#4A154B]/20 text-[#36C5F0] border border-[#4A154B]/30">
                {slackCount} {slackCount === 1 ? 'channel' : 'channels'}
              </span>
            </div>
            <p className="text-xs text-[#9a9aa5] line-clamp-2">
              Broadcast test run results with pass/fail counts, failure highlights, and one-click direct links.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDestination(null);
              setModalOpen(true);
            }}
            className="mt-4 pt-3 border-t border-[#20202a] text-xs font-semibold text-[#36C5F0] hover:text-[#93c5fd] flex items-center justify-between transition-colors"
          >
            <span>Configure Slack</span>
            <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>

        {/* Teams Card */}
        <div className="bg-[#14141b] border border-[#20202a] hover:border-[#6264A7]/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#6264A7]/20 border border-[#6264A7]/40 flex items-center justify-center text-[#a5b4fc] text-xl">
                  <i className="fab fa-microsoft"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#f4f4f7]">Microsoft Teams</h3>
                  <p className="text-[11px] text-[#9a9aa5]">Adaptive Cards & Connector</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#6264A7]/20 text-[#a5b4fc] border border-[#6264A7]/30">
                {teamsCount} {teamsCount === 1 ? 'channel' : 'channels'}
              </span>
            </div>
            <p className="text-xs text-[#9a9aa5] line-clamp-2">
              Deliver structured status cards to your Teams channels with color-coded badges and run breakdowns.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDestination(null);
              setModalOpen(true);
            }}
            className="mt-4 pt-3 border-t border-[#20202a] text-xs font-semibold text-[#a5b4fc] hover:text-[#93c5fd] flex items-center justify-between transition-colors"
          >
            <span>Configure Teams</span>
            <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>

        {/* Discord Card */}
        <div className="bg-[#14141b] border border-[#20202a] hover:border-[#5865F2]/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] text-xl">
                  <i className="fab fa-discord"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#f4f4f7]">Discord</h3>
                  <p className="text-[11px] text-[#9a9aa5]">Rich Embed webhooks</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#5865F2]/20 text-[#93c5fd] border border-[#5865F2]/30">
                {discordCount} {discordCount === 1 ? 'channel' : 'channels'}
              </span>
            </div>
            <p className="text-xs text-[#9a9aa5] line-clamp-2">
              Send color-coded rich embeds with failure highlights and AI diagnostics directly to Discord channels.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDestination(null);
              setModalOpen(true);
            }}
            className="mt-4 pt-3 border-t border-[#20202a] text-xs font-semibold text-[#5865F2] hover:text-[#93c5fd] flex items-center justify-between transition-colors"
          >
            <span>Configure Discord</span>
            <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'slack', 'teams', 'discord'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedProvider(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                selectedProvider === filter
                  ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/40'
                  : 'bg-[#14141b] text-[#9a9aa5] border-[#20202a] hover:text-[#f4f4f7]'
              }`}
            >
              {filter === 'all' ? 'All Providers' : filter}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e68] text-xs"></i>
          <input
            type="text"
            placeholder="Search channels or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#14141b] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
          />
        </div>
      </div>

      {/* Configured Destinations List */}
      <div className="bg-[#14141b] border border-[#20202a] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#9a9aa5] flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading alert channels...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-[#9a9aa5] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0e0e13] border border-[#20202a] flex items-center justify-center mx-auto text-[#5e5e68] text-2xl">
              <i className="fas fa-bell-slash"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f4f4f7]">No Alert Channels Found</h3>
              <p className="text-xs text-[#9a9aa5] mt-1 max-w-sm mx-auto">
                {searchQuery || selectedProvider !== 'all'
                  ? 'No integrations match your selected filter criteria.'
                  : 'Add your first Slack, Teams, or Discord webhook to receive automated test run notifications.'}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingDestination(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 bg-[#3b82f6]/10 border border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 text-[#3b82f6] rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-2"
            >
              <i className="fas fa-plus text-[10px]"></i>
              Create New Integration
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#20202a]">
            {filtered.map((dest) => {
              const meta = PROVIDER_METADATA[dest.provider] || PROVIDER_METADATA.webhook;
              const trigger = TRIGGER_LABELS[dest.events] || TRIGGER_LABELS.failures_only;
              const isTesting = testingId === dest.id;

              return (
                <div
                  key={dest.id}
                  className={`p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                    dest.enabled ? 'hover:bg-[#181822]/60' : 'opacity-60 bg-[#0e0e13]/40'
                  }`}
                >
                  {/* Channel Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                      style={{
                        backgroundColor: `${meta.brandColor}15`,
                        borderColor: `${meta.brandColor}40`,
                        color: meta.brandColor,
                      }}
                    >
                      <i className={meta.icon}></i>
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-[#f4f4f7] truncate">
                          {dest.name}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${meta.bgBadge}`}>
                          {dest.provider}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${trigger.color}`}>
                          {trigger.label}
                        </span>
                        {dest.include_ai_summary && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <i className="fas fa-brain text-[9px]"></i> AI Insights
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#9a9aa5] flex-wrap">
                        <span className="flex items-center gap-1">
                          <i className="fas fa-folder text-[10px] text-[#5e5e68]"></i>
                          {dest.project_name ? (
                            <strong className="text-[#f4f4f7] font-medium">{dest.project_name}</strong>
                          ) : (
                            <span className="text-[#93c5fd]">All Projects (Global)</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-[#5e5e68]">
                          <i className="fas fa-link text-[10px]"></i>
                          {maskUrl(dest.webhook_url || dest.webhookUrl || '')}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-[#9a9aa5]">
                          Branches: <code className="text-[#93c5fd] font-mono">{dest.branches || '*'}</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Send Test Notification */}
                    <button
                      onClick={() => handleTestDestination(dest)}
                      disabled={isTesting}
                      title="Send test notification to channel"
                      className="px-3 py-1.5 rounded-xl bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {isTesting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane text-[10px] text-[#3b82f6]"></i>
                          <span>Test</span>
                        </>
                      )}
                    </button>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleEnabled(dest)}
                      title={dest.enabled ? 'Mute notifications' : 'Enable notifications'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        dest.enabled
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-[#20202a] text-[#9a9aa5] border-[#30303f]'
                      }`}
                    >
                      <i className={`fas fa-${dest.enabled ? 'toggle-on' : 'toggle-off'}`}></i>
                      <span>{dest.enabled ? 'Active' : 'Muted'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingDestination(dest);
                        setModalOpen(true);
                      }}
                      title="Edit Channel"
                      className="w-8 h-8 rounded-xl bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#9a9aa5] hover:text-[#f4f4f7] flex items-center justify-center transition-colors text-xs"
                    >
                      <i className="fas fa-edit"></i>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(dest.id, dest.name)}
                      title="Delete Channel"
                      className="w-8 h-8 rounded-xl bg-[#0e0e13] border border-[#20202a] hover:border-red-500/40 text-[#9a9aa5] hover:text-red-400 flex items-center justify-center transition-colors text-xs"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Destination Add / Edit Modal */}
      {modalOpen && (
        <AlertDestinationModal
          destination={editingDestination}
          projects={projects}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingDestination(null);
          }}
          onSaved={() => {
            loadDestinations();
            setStatusMessage({
              type: 'success',
              text: `Integration ${editingDestination ? 'updated' : 'created'} successfully!`,
            });
            setTimeout(() => setStatusMessage(null), 3500);
          }}
        />
      )}

      {/* Delivery Logs Drawer */}
      <AlertDeliveryLogsDrawer
        logs={deliveryLogs}
        loading={loadingLogs}
        isOpen={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        onRefresh={loadLogs}
      />
    </div>
  );
};

export default AlertSettings;
