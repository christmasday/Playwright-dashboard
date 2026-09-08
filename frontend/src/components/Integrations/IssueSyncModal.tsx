import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import { IntegrationConfigItem, IntegrationProvider, IssueLink } from '../../types/api';

interface IssueSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  testRun: {
    id: string;
    name?: string;
    title?: string;
    file?: string;
    duration?: number;
    status?: string;
    error?: string;
    stackTrace?: string;
  };
  aiAnalysis?: {
    category?: string;
    rootCause?: string;
    confidence?: number;
    recommendedFix?: string;
    preventionAdvice?: string;
  } | null;
  onIssueCreated: (issue: IssueLink) => void;
}

export const IssueSyncModal: React.FC<IssueSyncModalProps> = ({
  isOpen,
  onClose,
  testRun,
  aiAnalysis,
  onIssueCreated,
}) => {
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>('github');
  const [configs, setConfigs] = useState<IntegrationConfigItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('High');
  const [issueType, setIssueType] = useState('Bug');
  const [labelsInput, setLabelsInput] = useState('playwright, automated-test, failure');
  const [includeError, setIncludeError] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [customNotes, setCustomNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form');

  // Initialize title when testRun changes
  useEffect(() => {
    if (testRun) {
      const name = testRun.title || testRun.name || 'Test';
      setTitle(`[Failure] ${name}`);
    }
  }, [testRun]);

  // Load configs
  useEffect(() => {
    if (isOpen) {
      setLoadingConfigs(true);
      apiService
        .getIntegrationConfigs()
        .then((res) => {
          const fetchedConfigs: IntegrationConfigItem[] = res.data?.data || [];
          setConfigs(fetchedConfigs);
          // If github is not configured but jira is, default to jira
          const hasGithub = fetchedConfigs.some((c) => c.provider === 'github' && c.enabled);
          const hasJira = fetchedConfigs.some((c) => c.provider === 'jira' && c.enabled);
          if (!hasGithub && hasJira) {
            setActiveProvider('jira');
          }
        })
        .catch((err) => {
          console.error('Failed to load integration configs', err);
        })
        .finally(() => {
          setLoadingConfigs(false);
        });
    }
  }, [isOpen]);

  const currentConfig = useMemo(() => {
    return configs.find((c) => c.provider === activeProvider && c.enabled);
  }, [configs, activeProvider]);

  // Live markdown preview
  const previewMarkdown = useMemo(() => {
    const testName = testRun.title || testRun.name || 'Test Execution';
    let md = `## 🚨 Automated Test Failure Report\n\n`;
    md += `**Test Name:** \`${testName}\`\n`;
    md += `**File:** \`${testRun.file || 'unknown'}\`\n`;
    md += `**Status:** \`${testRun.status || 'failed'}\`\n`;
    md += `**Duration:** \`${testRun.duration || 0}ms\`\n\n`;

    if (customNotes.trim()) {
      md += `### 📝 Reporter Notes\n${customNotes.trim()}\n\n`;
    }

    if (includeError && testRun.error) {
      md += `### ❌ Failure Message\n\`\`\`\n${testRun.error}\n\`\`\`\n\n`;
      if (testRun.stackTrace) {
        md += `<details><summary><b>Stack Trace</b> (click to expand)</summary>\n\n\`\`\`\n${testRun.stackTrace}\n\`\`\`\n</details>\n\n`;
      }
    }

    if (includeAi && aiAnalysis) {
      md += `### 🤖 AI Root Cause & Fix Analysis\n`;
      md += `- **Classification:** ${aiAnalysis.category || 'Runtime Failure'}\n`;
      if (aiAnalysis.confidence) {
        md += `- **Confidence:** ${Math.round(aiAnalysis.confidence * 100)}%\n`;
      }
      md += `\n**Root Cause:**\n> ${aiAnalysis.rootCause || 'N/A'}\n\n`;
      if (aiAnalysis.recommendedFix) {
        md += `**Suggested Fix:**\n\`\`\`typescript\n${aiAnalysis.recommendedFix}\n\`\`\`\n\n`;
      }
    }

    md += `---\n*Reported automatically from Playwright Test Dashboard*`;
    return md;
  }, [testRun, customNotes, includeError, includeAi, aiAnalysis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRun.id) return;
    setSubmitting(true);
    setSubmitError(null);

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const payload = {
        testRunId: testRun.id,
        provider: activeProvider,
        title: title.trim(),
        description: customNotes.trim(),
        priority,
        issueType: activeProvider === 'jira' ? issueType : undefined,
        labels,
        includeAi,
        includeError,
      };

      const res = await apiService.createIssueFromTest(payload);
      const createdLink: IssueLink = res.data?.data;
      if (createdLink) {
        onIssueCreated(createdLink);
        onClose();
      } else {
        throw new Error('No issue link returned from server');
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          err.message ||
          'Failed to create issue'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#15151c] border border-[#2b2b3b] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#1a1a24] border-b border-[#2b2b3b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <i className="fas fa-ticket text-sm"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f4f4f7] flex items-center gap-2">
                <span>1-Click Issue Sync</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[#282838] text-blue-400 border border-blue-500/20">
                  Instant Ticket
                </span>
              </h2>
              <p className="text-xs text-[#9a9aa5]">
                Generate an issue directly on Jira Software or GitHub Issues
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#282838] transition-colors"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-[#2b2b3b] bg-[#121218] px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveProvider('github')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeProvider === 'github'
                ? 'border-[#f4f4f7] text-[#f4f4f7]'
                : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
          >
            <i className="fa-brands fa-github text-sm"></i>
            <span>GitHub Issues</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveProvider('jira')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeProvider === 'jira'
                ? 'border-[#0052cc] text-[#2684ff]'
                : 'border-transparent text-[#9a9aa5] hover:text-[#2684ff]'
            }`}
          >
            <i className="fa-brands fa-jira text-sm text-[#0052cc]"></i>
            <span>Jira Software</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Check provider configuration */}
          {!loadingConfigs && !currentConfig && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <i className="fas fa-triangle-exclamation text-amber-400 text-sm mt-0.5"></i>
              <div className="flex-1 text-xs">
                <p className="font-bold text-amber-300">
                  {activeProvider === 'jira' ? 'Jira' : 'GitHub'} integration is not configured
                </p>
                <p className="text-[#9a9aa5] mt-0.5">
                  Set up your API credentials, repository or project key to enable 1-click issue creation.
                </p>
                <Link
                  to="/settings/integrations"
                  className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-amber-300 hover:text-amber-200 underline"
                >
                  <span>Configure {activeProvider === 'jira' ? 'Jira' : 'GitHub'} Settings</span>
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </Link>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
              <i className="fas fa-circle-exclamation text-sm shrink-0 mt-0.5"></i>
              <span>{submitError}</span>
            </div>
          )}

          {/* Sub-tabs: Edit Form vs Live Preview */}
          <div className="flex items-center justify-between pb-2 border-b border-[#252533]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab('form')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  previewTab === 'form'
                    ? 'bg-[#252535] text-[#f4f4f7]'
                    : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                <i className="fas fa-pen-to-square text-[11px] mr-1.5"></i> Details
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  previewTab === 'preview'
                    ? 'bg-[#252535] text-[#f4f4f7]'
                    : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                <i className="fas fa-eye text-[11px] mr-1.5"></i> Markdown Preview
              </button>
            </div>
            <span className="text-[11px] text-[#6e6e80]">
              Target: <span className="text-[#f4f4f7] font-mono">{activeProvider.toUpperCase()}</span>
            </span>
          </div>

          {previewTab === 'preview' ? (
            <div className="bg-[#0e0e13] border border-[#252535] rounded-xl p-4 font-mono text-xs text-[#d1d1db] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
              {previewMarkdown}
            </div>
          ) : (
            <form id="issue-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Summary / Title */}
              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Issue Summary / Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="[Failure] Test title"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>

              {/* Priority & Issue Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="Highest">Highest / Blocker</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Lowest">Lowest</option>
                  </select>
                </div>

                {activeProvider === 'jira' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                      Issue Type
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="Bug">Bug</option>
                      <option value="Task">Task</option>
                      <option value="Story">Story</option>
                      <option value="Incident">Incident</option>
                    </select>
                  </div>
                )}

                {activeProvider === 'github' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                      Repository
                    </label>
                    <input
                      type="text"
                      disabled
                      value={
                        currentConfig?.config?.owner && currentConfig?.config?.repo
                          ? `${currentConfig.config.owner}/${currentConfig.config.repo}`
                          : 'Configured in Settings'
                      }
                      className="w-full px-3 py-2 bg-[#0e0e13]/50 border border-[#262635] rounded-xl text-xs text-[#9a9aa5] font-mono cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Labels */}
              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Labels (comma-separated)
                </label>
                <input
                  type="text"
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="playwright, automated-test, e2e"
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] font-mono"
                />
              </div>

              {/* Additional Context Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                  Additional Notes / Steps to Reproduce (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Observed in staging build #412. Suspected flaky selector or auth token timeout..."
                  className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] resize-none"
                />
              </div>

              {/* Auto-included Evidence Toggles */}
              <div className="p-3.5 bg-[#101017] rounded-xl border border-[#252533] space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9a9aa5]">
                  Automated Failure Payload
                </p>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#f4f4f7]">
                  <input
                    type="checkbox"
                    checked={includeError}
                    onChange={(e) => setIncludeError(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2b2b3b] bg-[#1a1a24] text-[#3b82f6] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Include error message and collapsible stack trace</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#f4f4f7]">
                  <input
                    type="checkbox"
                    checked={includeAi}
                    onChange={(e) => setIncludeAi(e.target.checked)}
                    disabled={!aiAnalysis}
                    className="w-4 h-4 rounded border-[#2b2b3b] bg-[#1a1a24] text-[#3b82f6] focus:ring-0 focus:ring-offset-0 disabled:opacity-40"
                  />
                  <span className={!aiAnalysis ? 'text-[#6e6e80]' : ''}>
                    Include AI Root Cause & Fix suggestions
                    {!aiAnalysis && ' (Not generated yet for this test)'}
                  </span>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#1a1a24] border-t border-[#2b2b3b] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#9a9aa5] hover:text-[#f4f4f7] transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="issue-form"
            disabled={submitting || (!currentConfig && !loadingConfigs)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 ${
              activeProvider === 'jira'
                ? 'bg-[#0052cc] hover:bg-[#0047b3] shadow-blue-500/20'
                : 'bg-[#238636] hover:bg-[#2ea043] shadow-green-500/20'
            }`}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i>
                <span>Creating {activeProvider === 'jira' ? 'Jira' : 'GitHub'} Ticket...</span>
              </>
            ) : (
              <>
                <i
                  className={`text-xs ${
                    activeProvider === 'jira' ? 'fa-brands fa-jira' : 'fa-brands fa-github'
                  }`}
                ></i>
                <span>Create {activeProvider === 'jira' ? 'Jira Ticket' : 'GitHub Issue'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueSyncModal;
