/**
 * Alert Destination Modal
 * Add or edit Slack, Microsoft Teams, and Discord webhook configurations.
 */

import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import type { AlertDestination, AlertProvider, AlertEventTrigger, Project } from '../../types/api';

interface AlertDestinationModalProps {
  destination?: AlertDestination | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PROVIDER_CONFIGS: Record<AlertProvider, { name: string; icon: string; color: string; bg: string; border: string; hint: string }> = {
  slack: {
    name: 'Slack',
    icon: 'fab fa-slack',
    color: '#36C5F0',
    bg: 'bg-[#4A154B]/10',
    border: 'border-[#4A154B]/40 hover:border-[#36C5F0]/60',
    hint: 'Enter your Slack Incoming Webhook URL (e.g. https://hooks.slack.com/services/...)',
  },
  teams: {
    name: 'Microsoft Teams',
    icon: 'fab fa-microsoft',
    color: '#6264A7',
    bg: 'bg-[#6264A7]/10',
    border: 'border-[#6264A7]/40 hover:border-[#6264A7]/80',
    hint: 'Enter your Teams Incoming Webhook or Power Automate URL',
  },
  discord: {
    name: 'Discord',
    icon: 'fab fa-discord',
    color: '#5865F2',
    bg: 'bg-[#5865F2]/10',
    border: 'border-[#5865F2]/40 hover:border-[#5865F2]/80',
    hint: 'Enter your Discord Channel Webhook URL (e.g. https://discord.com/api/webhooks/...)',
  },
  webhook: {
    name: 'Generic Webhook',
    icon: 'fas fa-link',
    color: '#3b82f6',
    bg: 'bg-[#3b82f6]/10',
    border: 'border-[#3b82f6]/40 hover:border-[#3b82f6]/80',
    hint: 'Enter an HTTP/HTTPS endpoint URL that accepts JSON POST payloads',
  },
};

const AlertDestinationModal: React.FC<AlertDestinationModalProps> = ({
  destination,
  projects,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<AlertProvider>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [events, setEvents] = useState<AlertEventTrigger>('failures_only');
  const [branches, setBranches] = useState('*');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [enabled, setEnabled] = useState(true);

  // Testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (destination) {
      setName(destination.name || '');
      setProvider(destination.provider || 'slack');
      setWebhookUrl(destination.webhook_url || destination.webhookUrl || '');
      setProjectId(destination.project_id || destination.projectId || '');
      setEvents(destination.events || 'failures_only');
      setBranches(destination.branches || '*');
      setIncludeAiSummary(destination.include_ai_summary ?? destination.includeAiSummary ?? true);
      setEnabled(destination.enabled ?? true);
    } else {
      setName('');
      setProvider('slack');
      setWebhookUrl('');
      setProjectId('');
      setEvents('failures_only');
      setBranches('*');
      setIncludeAiSummary(true);
      setEnabled(true);
    }
    setTestResult(null);
    setFormError(null);
  }, [destination, isOpen]);

  if (!isOpen) return null;

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setFormError('Please enter a Webhook URL first before testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setFormError(null);

    try {
      const resp = await apiService.testAlertDestination({
        provider,
        webhookUrl: webhookUrl.trim(),
        destinationId: destination?.id,
      });

      if (resp.data?.success) {
        setTestResult({
          success: true,
          message: resp.data.message || 'Test notification sent successfully!',
        });
      } else {
        setTestResult({
          success: false,
          error: resp.data?.error || 'Webhook test failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.response?.data?.error || err.message || 'Failed to dispatch test notification',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Channel or destination name is required');
      return;
    }

    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      setFormError('A valid HTTP or HTTPS Webhook URL is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        provider,
        webhookUrl: webhookUrl.trim(),
        projectId: projectId ? projectId : null,
        events,
        branches: branches.trim() || '*',
        includeAiSummary,
        enabled,
      };

      if (destination?.id) {
        await apiService.updateAlertDestination(destination.id, payload);
      } else {
        await apiService.createAlertDestination(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || err.message || 'Failed to save alert destination');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#101017] border border-[#20202a] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#20202a] flex items-center justify-between bg-[#0e0e13]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-bell text-base"></i>
            </span>
            <div>
              <h2 id="modal-headline" className="text-lg font-bold text-[#f4f4f7]">
                {destination ? 'Edit Alert Destination' : 'Configure Alert Channel'}
              </h2>
              <p className="text-xs text-[#9a9aa5]">
                Send automated test summaries to Slack, Teams, or Discord
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] hover:border-[#3b82f6]/40 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-sm shrink-0"></i>
              <span>{formError}</span>
            </div>
          )}

          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#f4f4f7] mb-2">
              Notification Platform
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['slack', 'teams', 'discord'] as AlertProvider[]).map((p) => {
                const conf = PROVIDER_CONFIGS[p];
                const selected = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setTestResult(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center ${
                      selected
                        ? 'bg-[#14141b] border-[#3b82f6] shadow-md shadow-[#3b82f6]/10'
                        : 'bg-[#08080a] border-[#20202a] hover:bg-[#14141b] text-[#9a9aa5]'
                    }`}
                  >
                    <i
                      className={`${conf.icon} text-2xl mb-1.5`}
                      style={{ color: selected ? conf.color : '#9a9aa5' }}
                    ></i>
                    <span className={`text-xs font-semibold ${selected ? 'text-[#f4f4f7]' : 'text-[#9a9aa5]'}`}>
                      {conf.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
              Channel or Destination Label <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. #qa-ci-builds or Engineering Alerts"
              className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
          </div>

          {/* Webhook URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#f4f4f7]">
                Incoming Webhook URL <span className="text-red-400">*</span>
              </label>
              <span className="text-[10px] text-[#9a9aa5]">HTTPS Endpoint</span>
            </div>
            <input
              type="url"
              required
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] font-mono transition-colors"
            />
            <p className="text-[11px] text-[#5e5e68] mt-1.5 flex items-center gap-1.5">
              <i className="fas fa-info-circle text-[#3b82f6]"></i>
              {PROVIDER_CONFIGS[provider]?.hint}
            </p>
          </div>

          {/* Live Webhook Test Button & Banner */}
          <div className="p-3 bg-[#08080a] border border-[#20202a] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#f4f4f7]">Verify Connection</div>
                <div className="text-[10px] text-[#9a9aa5]">Send a sample notification to ensure your webhook is live</div>
              </div>
              <button
                type="button"
                disabled={testing || !webhookUrl.trim()}
                onClick={handleTestWebhook}
                className="px-3 py-1.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#3b82f6] hover:text-[#93c5fd] rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {testing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane text-[10px]"></i>
                    Send Test Notification
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                <i className={`fas fa-${testResult.success ? 'check-circle' : 'times-circle'}`}></i>
                <span className="flex-1">{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            )}
          </div>

          {/* Target Project Scope */}
          <div>
            <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
              Target Project Scope
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] transition-colors"
            >
              <option value="">All Projects (Global Alert Channel)</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  Project: {proj.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#5e5e68] mt-1">
              {projectId ? 'Only builds for the selected project will alert this channel.' : 'Builds from any project will be broadcast to this channel.'}
            </p>
          </div>

          {/* Trigger Condition */}
          <div>
            <label className="block text-xs font-semibold text-[#f4f4f7] mb-2">
              Notification Trigger Rule
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'failures_only',
                  label: 'Failures Only',
                  desc: 'Alert only when tests fail',
                  icon: 'fas fa-exclamation-triangle text-red-400',
                  badge: 'Recommended',
                },
                {
                  id: 'all',
                  label: 'Every Build',
                  desc: 'Alert on pass, fail, or flaky',
                  icon: 'fas fa-check-double text-[#3b82f6]',
                },
                {
                  id: 'status_change',
                  label: 'Status Changes',
                  desc: 'Alert on regression or fix',
                  icon: 'fas fa-exchange-alt text-amber-400',
                },
              ].map((t) => {
                const isSelected = events === t.id;
                return (
                  <label
                    key={t.id}
                    onClick={() => setEvents(t.id as AlertEventTrigger)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#14141b] border-[#3b82f6] text-[#f4f4f7]'
                        : 'bg-[#08080a] border-[#20202a] hover:border-[#30303f] text-[#9a9aa5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#f4f4f7]">
                          <i className={t.icon}></i> {t.label}
                        </span>
                        {t.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9a9aa5]">{t.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Branch Filter Pattern */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#f4f4f7]">
                Branch Filter
              </label>
              <span className="text-[10px] text-[#9a9aa5]">Wildcards supported</span>
            </div>
            <input
              type="text"
              value={branches}
              onChange={(e) => setBranches(e.target.value)}
              placeholder="e.g. main, release/* or *"
              className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] font-mono placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6] transition-colors"
            />
            <p className="text-[10px] text-[#5e5e68] mt-1">
              Use <code className="text-[#93c5fd]">*</code> to match all branches, or comma-separated list like <code className="text-[#93c5fd]">main, staging, release/*</code>.
            </p>
          </div>

          {/* Checkbox Toggles */}
          <div className="space-y-3 pt-2 border-t border-[#20202a]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAiSummary}
                onChange={(e) => setIncludeAiSummary(e.target.checked)}
                className="w-4 h-4 rounded border-[#20202a] bg-[#08080a] text-[#3b82f6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-[#f4f4f7] flex items-center gap-1.5">
                  <i className="fas fa-brain text-purple-400 text-xs"></i>
                  Include AI Root Cause & Fix Suggestions
                </div>
                <div className="text-[10px] text-[#9a9aa5]">
                  Automatically append concise AI diagnostics to failing build messages
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-[#20202a] bg-[#08080a] text-[#3b82f6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-[#f4f4f7]">Active & Enabled</div>
                <div className="text-[10px] text-[#9a9aa5]">
                  Disable to temporarily mute notifications without removing credentials
                </div>
              </div>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#20202a] bg-[#0e0e13] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 text-[#08080a] rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#08080a] border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-check text-xs"></i>
                {destination ? 'Update Integration' : 'Save Integration'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDestinationModal;
