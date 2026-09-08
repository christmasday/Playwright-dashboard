import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { IntegrationConfigItem, IssueLink } from '../types/api';

export const IntegrationSettings: React.FC = () => {
  const [configs, setConfigs] = useState<IntegrationConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentIssues, setRecentIssues] = useState<IssueLink[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Tab: 'github' | 'jira' | 'issues'
  const [activeTab, setActiveTab] = useState<'github' | 'jira' | 'issues'>('github');

  // GitHub Form
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [ghLabels, setGhLabels] = useState('playwright, automated-test');
  const [ghEnabled, setGhEnabled] = useState(true);

  // Jira Form
  const [jiraHost, setJiraHost] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraIssueType, setJiraIssueType] = useState('Bug');
  const [jiraPriority, setJiraPriority] = useState('High');
  const [jiraEnabled, setJiraEnabled] = useState(true);

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [syncingIssueId, setSyncingIssueId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getIntegrationConfigs();
      const items: IntegrationConfigItem[] = res.data?.data || [];
      setConfigs(items);

      // Populate GitHub form if exists
      const gh = items.find((c) => c.provider === 'github');
      if (gh && gh.config) {
        setGhOwner(gh.config.owner || '');
        setGhRepo(gh.config.repo || '');
        setGhToken(gh.config.token || '');
        setGhLabels((gh.config.default_labels || []).join(', '));
        setGhEnabled(gh.enabled ?? true);
      }

      // Populate Jira form if exists
      const jira = items.find((c) => c.provider === 'jira');
      if (jira && jira.config) {
        setJiraHost(jira.config.host_url || '');
        setJiraEmail(jira.config.email || '');
        setJiraToken(jira.config.api_token || '');
        setJiraProjectKey(jira.config.project_key || '');
        setJiraIssueType(jira.config.issue_type || 'Bug');
        setJiraPriority(jira.config.default_priority || 'High');
        setJiraEnabled(jira.enabled ?? true);
      }
    } catch (err: any) {
      console.error('Failed to load integration configurations', err);
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to load integration configurations.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentIssues = async () => {
    setLoadingIssues(true);
    try {
      const res = await apiService.getLinkedIssues();
      setRecentIssues(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load linked issues', err);
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    loadData();
    loadRecentIssues();
  }, []);

  const handleTestConnection = async (provider: 'github' | 'jira') => {
    setTestingProvider(provider);
    setStatusMessage(null);
    try {
      const config =
        provider === 'github'
          ? {
              owner: ghOwner.trim(),
              repo: ghRepo.trim(),
              token: ghToken.trim(),
            }
          : {
              host_url: jiraHost.trim(),
              email: jiraEmail.trim(),
              api_token: jiraToken.trim(),
              project_key: jiraProjectKey.trim(),
            };

      const res = await apiService.testIntegrationConnection({ provider, config });
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: true,
          message: res.data?.message || `Successfully connected to ${provider.toUpperCase()}!`,
        },
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: err?.response?.data?.error || `Failed to connect to ${provider.toUpperCase()}`,
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvider('github');
    setStatusMessage(null);
    try {
      const labels = ghLabels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      await apiService.saveIntegrationConfig({
        provider: 'github',
        config: {
          owner: ghOwner.trim(),
          repo: ghRepo.trim(),
          token: ghToken.trim(),
          default_labels: labels,
        },
        enabled: ghEnabled,
      });

      setStatusMessage({ type: 'success', text: 'GitHub configuration saved successfully.' });
      loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to save GitHub configuration.',
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const handleSaveJira = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvider('jira');
    setStatusMessage(null);
    try {
      await apiService.saveIntegrationConfig({
        provider: 'jira',
        config: {
          host_url: jiraHost.trim(),
          email: jiraEmail.trim(),
          api_token: jiraToken.trim(),
          project_key: jiraProjectKey.trim(),
          issue_type: jiraIssueType,
          default_priority: jiraPriority,
        },
        enabled: jiraEnabled,
      });

      setStatusMessage({ type: 'success', text: 'Jira Software configuration saved successfully.' });
      loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to save Jira configuration.',
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const handleSyncIssue = async (id: string) => {
    setSyncingIssueId(id);
    try {
      const res = await apiService.syncIssue(id);
      const updated = res.data?.data;
      if (updated) {
        setRecentIssues((prev) => prev.map((item) => (item.id === id ? updated : item)));
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to sync issue status');
    } finally {
      setSyncingIssueId(null);
    }
  };

  const handleUnlinkIssue = async (id: string) => {
    if (!window.confirm('Are you sure you want to unlink this issue? The remote ticket will not be deleted.')) {
      return;
    }
    try {
      await apiService.unlinkIssue(id);
      setRecentIssues((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to unlink issue');
    }
  };

  const isGhConfigured = configs.some((c) => c.provider === 'github' && c.enabled);
  const isJiraConfigured = configs.some((c) => c.provider === 'jira' && c.enabled);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#9a9aa5] space-y-3">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading issue tracker integrations…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-ticket text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] flex items-center gap-3">
                <span>Issue Tracker Integrations</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  1-Click Sync
                </span>
              </h1>
              <p className="text-sm text-[#9a9aa5] mt-1">
                Link test failures seamlessly with Jira Software and GitHub Issues with bidirectional status updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                isGhConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[#121218] text-[#6e6e80] border-[#20202a]'
              }`}
            >
              <i className="fa-brands fa-github"></i>
              <span>GitHub: {isGhConfigured ? 'Active' : 'Not setup'}</span>
            </span>

            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                isJiraConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[#121218] text-[#6e6e80] border-[#20202a]'
              }`}
            >
              <i className="fa-brands fa-jira text-[#0052cc]"></i>
              <span>Jira: {isJiraConfigured ? 'Active' : 'Not setup'}</span>
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border animate-fadeIn ${
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

      {/* Main Tabs */}
      <div className="border-b border-[#20202a]">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { key: 'github', label: 'GitHub Issues', icon: 'fa-brands fa-github' },
            { key: 'jira', label: 'Jira Software', icon: 'fa-brands fa-jira' },
            {
              key: 'issues',
              label: `Linked Test Issues (${recentIssues.length})`,
              icon: 'fas fa-link',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* GITHUB TAB */}
      {activeTab === 'github' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1a1a22] border border-[#20202a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#20202a]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#f4f4f7]">
                  <i className="fa-brands fa-github text-lg"></i>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#f4f4f7]">GitHub Integration</h2>
                  <p className="text-xs text-[#9a9aa5]">Create issues on repository with test stack trace</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#f4f4f7]">
                <input
                  type="checkbox"
                  checked={ghEnabled}
                  onChange={(e) => setGhEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2b2b3b] bg-[#121218] text-[#3b82f6]"
                />
                <span>Enabled</span>
              </label>
            </div>

            <form onSubmit={handleSaveGitHub} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Repository Owner / Organization <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    placeholder="e.g. facebook, microsoft, your-org"
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Repository Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="e.g. playwright, my-app"
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Personal Access Token (PAT) <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required={!ghToken}
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_••••••••••••••••"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] font-mono"
                />
                <p className="text-[11px] text-[#6e6e80] mt-1">
                  Requires <code className="text-[#3b82f6]">repo</code> or <code className="text-[#3b82f6]">issues:write</code> permissions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Default Labels
                </label>
                <input
                  type="text"
                  value={ghLabels}
                  onChange={(e) => setGhLabels(e.target.value)}
                  placeholder="playwright, automated-test, bug"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              {testResult['github'] && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    testResult['github'].success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  <i
                    className={`fas ${
                      testResult['github'].success ? 'fa-check' : 'fa-xmark'
                    } mr-1.5`}
                  ></i>
                  <span>{testResult['github'].message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#20202a]">
                <button
                  type="button"
                  onClick={() => handleTestConnection('github')}
                  disabled={testingProvider === 'github' || !ghOwner || !ghRepo}
                  className="px-4 py-2 bg-[#252535] hover:bg-[#303045] text-xs font-semibold text-[#f4f4f7] rounded-xl transition-colors border border-[#37374d] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i
                    className={`fas fa-vial text-xs ${
                      testingProvider === 'github' ? 'fa-spin text-[#3b82f6]' : ''
                    }`}
                  ></i>
                  <span>{testingProvider === 'github' ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingProvider === 'github'}
                  className="px-5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingProvider === 'github' ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check text-xs"></i>
                      <span>Save GitHub Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 shadow-lg space-y-4 text-xs">
            <h3 className="font-bold text-[#f4f4f7] flex items-center gap-2">
              <i className="fas fa-circle-question text-blue-400"></i>
              <span>GitHub Setup Guide</span>
            </h3>
            <ol className="list-decimal pl-4 space-y-2 text-[#9a9aa5]">
              <li>
                Go to GitHub <strong className="text-[#f4f4f7]">Settings → Developer settings → Personal access tokens</strong>.
              </li>
              <li>
                Generate a new token with <code className="text-[#3b82f6]">repo</code> scope for private repositories or <code className="text-[#3b82f6]">public_repo</code> for open-source repos.
              </li>
              <li>Paste the repository owner and repository name above.</li>
              <li>Click <strong>Test Connection</strong> to verify token access.</li>
            </ol>
            <div className="p-3 bg-[#121218] border border-[#262635] rounded-lg text-[11px] text-[#6e6e80]">
              🔐 <strong>Security Note:</strong> Tokens are encrypted at rest and masked in API responses.
            </div>
          </div>
        </div>
      )}

      {/* JIRA TAB */}
      {activeTab === 'jira' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1a1a22] border border-[#20202a] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#20202a]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0052cc]/10 border border-[#0052cc]/30 flex items-center justify-center text-[#2684ff]">
                  <i className="fa-brands fa-jira text-lg"></i>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#f4f4f7]">Jira Software Integration</h2>
                  <p className="text-xs text-[#9a9aa5]">
                    Generate Jira Cloud/Server issues formatted with Atlassian Document Format (ADF)
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#f4f4f7]">
                <input
                  type="checkbox"
                  checked={jiraEnabled}
                  onChange={(e) => setJiraEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2b2b3b] bg-[#121218] text-[#3b82f6]"
                />
                <span>Enabled</span>
              </label>
            </div>

            <form onSubmit={handleSaveJira} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Jira Host URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={jiraHost}
                  onChange={(e) => setJiraHost(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Account Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Project Key <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                    placeholder="e.g. QA, PLAY, PROJ"
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Jira API Token <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required={!jiraToken}
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] font-mono"
                />
                <p className="text-[11px] text-[#6e6e80] mt-1">
                  Generated from <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">Atlassian API Tokens</a>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Default Issue Type
                  </label>
                  <select
                    value={jiraIssueType}
                    onChange={(e) => setJiraIssueType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="Bug">Bug</option>
                    <option value="Task">Task</option>
                    <option value="Story">Story</option>
                    <option value="Incident">Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                    Default Priority
                  </label>
                  <select
                    value={jiraPriority}
                    onChange={(e) => setJiraPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="Highest">Highest / Blocker</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {testResult['jira'] && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    testResult['jira'].success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  <i
                    className={`fas ${
                      testResult['jira'].success ? 'fa-check' : 'fa-xmark'
                    } mr-1.5`}
                  ></i>
                  <span>{testResult['jira'].message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#20202a]">
                <button
                  type="button"
                  onClick={() => handleTestConnection('jira')}
                  disabled={testingProvider === 'jira' || !jiraHost || !jiraEmail || !jiraProjectKey}
                  className="px-4 py-2 bg-[#252535] hover:bg-[#303045] text-xs font-semibold text-[#f4f4f7] rounded-xl transition-colors border border-[#37374d] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i
                    className={`fas fa-vial text-xs ${
                      testingProvider === 'jira' ? 'fa-spin text-[#3b82f6]' : ''
                    }`}
                  ></i>
                  <span>{testingProvider === 'jira' ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingProvider === 'jira'}
                  className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 shadow-blue-500/20"
                >
                  {savingProvider === 'jira' ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check text-xs"></i>
                      <span>Save Jira Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 shadow-lg space-y-4 text-xs">
            <h3 className="font-bold text-[#f4f4f7] flex items-center gap-2">
              <i className="fas fa-circle-question text-blue-400"></i>
              <span>Jira Setup Guide</span>
            </h3>
            <ol className="list-decimal pl-4 space-y-2 text-[#9a9aa5]">
              <li>
                Sign in to your Atlassian account and visit <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">API Tokens</a>.
              </li>
              <li>Create a new token named e.g. <strong className="text-[#f4f4f7]">Playwright Dashboard Sync</strong>.</li>
              <li>Input your organization's domain (e.g. <code>https://myorg.atlassian.net</code>).</li>
              <li>Provide your Atlassian email and target Project Key (e.g. <code>QA</code>).</li>
              <li>Click <strong>Test Connection</strong> to verify issue creation permissions.</li>
            </ol>
            <div className="p-3 bg-[#121218] border border-[#262635] rounded-lg text-[11px] text-[#6e6e80]">
              ✨ <strong>ADF Rich Text:</strong> Stack traces and test details are converted automatically into native Jira code blocks and callouts.
            </div>
          </div>
        </div>
      )}

      {/* ISSUES TAB */}
      {activeTab === 'issues' && (
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#20202a]">
            <div>
              <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <span>All Synced Test Issues</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[#282838] text-[#9a9aa5]">
                  {recentIssues.length} total
                </span>
              </h2>
              <p className="text-xs text-[#9a9aa5]">
                List of issues created from automated test runs with real-time status tracking
              </p>
            </div>

            <button
              onClick={loadRecentIssues}
              disabled={loadingIssues}
              className="px-3 py-1.5 bg-[#252535] hover:bg-[#303045] text-xs font-semibold text-[#f4f4f7] rounded-lg transition-colors border border-[#37374d] flex items-center gap-1.5"
            >
              <i className={`fas fa-arrows-rotate text-xs ${loadingIssues ? 'fa-spin text-[#3b82f6]' : ''}`}></i>
              <span>Refresh Table</span>
            </button>
          </div>

          {recentIssues.length === 0 ? (
            <div className="text-center py-10 px-4 bg-[#121218] rounded-xl border border-dashed border-[#262635]">
              <i className="fas fa-ticket text-3xl text-[#6e6e80] mb-2"></i>
              <p className="text-xs font-medium text-[#f4f4f7]">No issues created yet</p>
              <p className="text-xs text-[#9a9aa5] max-w-sm mx-auto mt-1">
                Open any failed test on the Test Details page and click "Sync to Jira / GitHub" to create your first issue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#252535] text-[#9a9aa5] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Issue Key</th>
                    <th className="py-2.5 px-3">Summary</th>
                    <th className="py-2.5 px-3">Test Case</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Synced</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#20202a]">
                  {recentIssues.map((issue) => {
                    const isSyncing = syncingIssueId === issue.id;
                    return (
                      <tr key={issue.id} className="hover:bg-[#15151e] transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              issue.provider === 'jira'
                                ? 'bg-[#0052cc]/10 text-[#2684ff]'
                                : 'bg-white/5 text-[#f4f4f7]'
                            }`}
                          >
                            <i
                              className={
                                issue.provider === 'jira' ? 'fa-brands fa-jira' : 'fa-brands fa-github'
                              }
                            ></i>
                            <span>{issue.provider}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#3b82f6]">
                          <a
                            href={issue.issue_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{issue.issue_key}</span>
                            <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                          </a>
                        </td>
                        <td className="py-3 px-3 text-[#f4f4f7] font-medium max-w-xs truncate" title={issue.issue_title}>
                          {issue.issue_title}
                        </td>
                        <td className="py-3 px-3 text-[#9a9aa5] max-w-xs truncate font-mono text-[11px]" title={issue.test_name}>
                          {issue.test_name}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              issue.issue_status.toLowerCase().includes('close') ||
                              issue.issue_status.toLowerCase().includes('done')
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : issue.issue_status.toLowerCase().includes('progress')
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {issue.issue_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#6e6e80] text-[11px]">
                          {issue.last_synced_at
                            ? new Date(issue.last_synced_at).toLocaleTimeString()
                            : new Date(issue.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSyncIssue(issue.id)}
                              disabled={isSyncing}
                              title="Sync status from remote"
                              className="p-1.5 text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#252535] rounded-lg transition-colors"
                            >
                              <i
                                className={`fas fa-arrows-rotate text-xs ${
                                  isSyncing ? 'fa-spin text-[#3b82f6]' : ''
                                }`}
                              ></i>
                            </button>
                            <a
                              href={issue.issue_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in tracker"
                              className="p-1.5 text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#252535] rounded-lg transition-colors"
                            >
                              <i className="fas fa-external-link-alt text-xs"></i>
                            </a>
                            <button
                              onClick={() => handleUnlinkIssue(issue.id)}
                              title="Unlink"
                              className="p-1.5 text-[#6e6e80] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <i className="fas fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationSettings;
