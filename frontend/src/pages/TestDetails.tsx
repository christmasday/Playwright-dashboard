/**
 * Deep Granular Test Run Details & Analytics Page
 * Inspects individual test step executions, error stack traces, terminal output,
 * failure screenshots, video recordings, and historical metrics.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import TestStepViewer from '../components/Visualization/TestStepViewer';
import ScreenshotGallery from '../components/Visualization/ScreenshotGallery';
import StackTraceModal from '../components/Visualization/StackTraceModal';
import TerminalOutput from '../components/Visualization/TerminalOutput';
import MetricsDashboard from '../components/Visualization/MetricsDashboard';
import TraceViewerModal from '../components/Visualization/TraceViewerModal';
import AiAnalysisCard from '../components/Visualization/AiAnalysisCard';

interface TestRunResponse {
  id: string;
  name: string;
  title: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky' | 'timeout' | 'quarantined';
  duration: number;
  retries?: number;
  startedAt?: string;
  started_at?: string;
  endedAt?: string;
  steps?: TestStepResponse[];
  artifacts?: ArtifactResponse[];
  error?: string;
  stackTrace?: string;
  terminalOutput?: TerminalLine[];
  buildId?: string;
  build_id?: string;
}

interface TestStepResponse {
  id: string;
  stepNumber: number;
  stepTitle: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
  errorLocation?: string;
}

interface ArtifactResponse {
  id: string;
  testRunId: string;
  type: 'screenshot' | 'video' | 'trace' | 'log';
  name: string;
  path: string;
  url: string;
  size: number;
}

interface TerminalLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

const TestDetails: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [testRun, setTestRun] = useState<TestRunResponse | null>(null);
  const [siblingTests, setSiblingTests] = useState<TestRunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'steps' | 'artifacts' | 'metrics'>(() => {
    if (tabParam === 'ai' || tabParam === 'steps' || tabParam === 'artifacts' || tabParam === 'metrics' || tabParam === 'overview') {
      return tabParam;
    }
    return 'overview';
  });
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedTraceUrl, setSelectedTraceUrl] = useState<string | null>(null);
  const [selectedTraceName, setSelectedTraceName] = useState<string>('trace.zip');

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [stackTraceModalOpen, setStackTraceModalOpen] = useState(false);
  const [stackTraceModalData, setStackTraceModalData] = useState<{
    error: { message: string; stack?: string; location?: string };
    title?: string;
  } | null>(null);

  // Check for existing AI analysis cache on mount
  useEffect(() => {
    if (testId) {
      apiService
        .getTestAiAnalysis(testId)
        .then((res) => {
          if (res.data?.data) {
            setAiAnalysis(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [testId]);

  const handleTriggerAiAnalysis = async (forceRegenerate = false) => {
    if (!testId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiService.analyzeTest(testId, { forceRegenerate });
      if (res.data?.data) {
        setAiAnalysis(res.data.data);
        setActiveTab('overview');
      }
    } catch (err: any) {
      setAiError(err?.response?.data?.error || err.message || 'AI diagnosis failed');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (tabParam === 'ai' || tabParam === 'steps' || tabParam === 'artifacts' || tabParam === 'metrics' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleOpenTrace = (url: string, name?: string) => {
    setSelectedTraceUrl(url);
    if (name) setSelectedTraceName(name);
    setTraceModalOpen(true);
  };

  const handleOpenStackTrace = async (t?: { id?: string; name?: string; title?: string; status?: string; error?: string; stackTrace?: string; file?: string }) => {
    let targetTitle = t?.name || t?.title || testRun?.title || testRun?.name || 'Test Case';
    let targetLocation = t?.file || testRun?.file;
    let targetMessage = t?.error;
    let targetStack = t?.stackTrace;

    // If sibling test, fetch its full test details so we have its exact error and stack trace
    if (t?.id && t.id !== testRun?.id) {
      try {
        const resp = await apiService.getTestDetails(t.id);
        const data = resp.data;
        if (data) {
          targetTitle = data.title || data.name || targetTitle;
          targetLocation = data.file || targetLocation;
          targetMessage = data.error;
          targetStack = data.stackTrace;
          if ((!targetMessage || targetMessage === 'Test execution failed') && data.steps) {
            const failedS = data.steps.find((s: any) => s.status === 'failed' && s.error);
            if (failedS) {
              targetMessage = failedS.error;
              targetLocation = failedS.errorLocation || targetLocation;
            }
          }
        }
      } catch (_) {}
    } else if (!targetMessage) {
      targetMessage = testRun?.error;
      targetStack = testRun?.stackTrace;
    }

    // Fallback to active steps if error is still generic or missing
    const failedStepsList = steps.filter((s) => s.status === 'failed');
    if (!targetMessage || targetMessage === 'Test execution failed' || targetMessage === 'Test assertion condition failed') {
      const stepWithErr = failedStepsList.find((s) => s.error && s.error.trim() !== '');
      if (stepWithErr) {
        targetMessage = stepWithErr.error;
        if (stepWithErr.errorLocation) targetLocation = stepWithErr.errorLocation;
      } else if (failedStepsList.length > 0) {
        const stepNames = failedStepsList.map((s) => s.stepTitle || `Step ${s.stepNumber}`).join(' -> ');
        targetMessage = `Assertion failure in test step: ${stepNames}`;
      } else {
        targetMessage = `Failure during execution of "${targetTitle}" in ${targetLocation || 'spec'}`;
      }
    }

    if (!targetStack && targetLocation) {
      targetStack = `Error: ${targetMessage}\n    at ${targetLocation}:1:1`;
    }

    setStackTraceModalData({
      title: targetTitle,
      error: {
        message: targetMessage || 'Test assertion failed',
        stack: targetStack || `Error: ${targetMessage}`,
        location: targetLocation,
      },
    });
    setStackTraceModalOpen(true);
  };

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (!testId) return;

      try {
        setLoading(true);
        const response = await apiService.getTestDetails(testId);
        const data = response.data;
        setTestRun(data);

        const bId = data.buildId || data.build_id;
        if (bId) {
          try {
            const siblingsResp = await apiService.getTestsByStatus(bId, 'all', 500);
            const rawSiblings = siblingsResp?.data?.tests || siblingsResp?.data?.data || (Array.isArray(siblingsResp?.data) ? siblingsResp.data : []);
            setSiblingTests(Array.isArray(rawSiblings) ? rawSiblings : []);
          } catch (_) {}
        }
      } catch (error) {
        console.error('Error fetching test details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetails();
  }, [testId]);

  const effectiveBuildId = testRun?.buildId || testRun?.build_id || '';

  // Filter sibling tests belonging to the same spec file or build
  const suiteTests = useMemo(() => {
    if (!testRun || !Array.isArray(siblingTests)) return [];
    const sameFile = siblingTests.filter(
      (t) => (t.file && testRun.file && t.file === testRun.file) || (t.title && testRun.title && t.title === testRun.title)
    );
    return sameFile.length > 0 ? sameFile : siblingTests;
  }, [siblingTests, testRun]);

  const steps = testRun?.steps || [];
  const artifacts = testRun?.artifacts || [];
  const isFailed = testRun?.status === 'failed';
  const isPassed = testRun?.status === 'passed';
  const startTime = testRun?.startedAt || testRun?.started_at;

  const getAuthUrl = (url?: string, path?: string) => {
    let fileUrl = url || path || '';
    if (!fileUrl) return '#';
    if (fileUrl.startsWith('/') && !fileUrl.startsWith('/api/')) {
      fileUrl = `/api/tests/artifact-file?path=${encodeURIComponent(fileUrl)}`;
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !fileUrl.includes('token=')) {
      fileUrl = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return fileUrl;
  };

  const screenshots = useMemo(() => {
    return artifacts.filter((a) => {
      const type = (a.type || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const path = ((a as any).path || '').toLowerCase();
      const url = (a.url || '').toLowerCase();
      return (
        type === 'screenshot' ||
        type === 'image' ||
        name.includes('screenshot') ||
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        url.includes('.png') ||
        url.includes('.jpg') ||
        url.includes('.jpeg')
      );
    });
  }, [artifacts]);

  const videos = useMemo(() => {
    return artifacts.filter((a) => {
      const type = (a.type || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const path = ((a as any).path || '').toLowerCase();
      const url = (a.url || '').toLowerCase();
      return (
        type === 'video' ||
        name.includes('video') ||
        path.endsWith('.webm') ||
        path.endsWith('.mp4') ||
        url.includes('.webm') ||
        url.includes('.mp4')
      );
    });
  }, [artifacts]);

  const traceArtifacts = useMemo(() => {
    return artifacts.filter((a) => {
      const type = (a.type || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const path = ((a as any).path || '').toLowerCase();
      const url = (a.url || '').toLowerCase();
      return (
        type === 'trace' ||
        name.includes('trace') ||
        path.endsWith('.zip') ||
        url.includes('.zip')
      );
    });
  }, [artifacts]);

  const logArtifacts = useMemo(() => {
    return artifacts.filter((a) => {
      const type = (a.type || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const path = ((a as any).path || '').toLowerCase();
      const url = (a.url || '').toLowerCase();
      return (
        type === 'log' ||
        name.includes('log') ||
        path.endsWith('.log') ||
        path.endsWith('.txt') ||
        url.includes('.log') ||
        url.includes('.txt')
      );
    });
  }, [artifacts]);

  const otherArtifacts = useMemo(() => {
    const knownIds = new Set([
      ...screenshots.map((a) => a.id),
      ...videos.map((a) => a.id),
      ...traceArtifacts.map((a) => a.id),
      ...logArtifacts.map((a) => a.id),
    ]);
    return artifacts.filter((a) => !knownIds.has(a.id));
  }, [artifacts, screenshots, videos, traceArtifacts, logArtifacts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#9a9aa5] space-y-3">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading granular test run details…</p>
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-[#f4f4f7] mb-2">Test Run Not Found</h2>
          <p className="text-sm text-[#9a9aa5] mb-4">The requested test run record does not exist or was deleted.</p>
          <Link
            to="/builds"
            className="px-4 py-2 bg-[#3b82f6] text-white font-medium text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            ← Back to Builds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Breadcrumbs */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs text-[#9a9aa5] mb-3">
          <Link to="/builds" className="hover:text-[#f4f4f7] transition-colors">
            Builds
          </Link>
          {effectiveBuildId && (
            <>
              <span>/</span>
              <Link to={`/builds/${effectiveBuildId}`} className="hover:text-[#f4f4f7] transition-colors font-mono">
                Build Details
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#f4f4f7] font-medium">{testRun.title || testRun.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-[#f4f4f7]">{testRun.title || testRun.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPassed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isFailed
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : testRun.status === 'flaky'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}
              >
                {testRun.status}
              </span>
            </div>
            <p className="text-xs text-[#9a9aa5] mt-1 flex items-center gap-2">
              <span>Spec File:</span>
              <code className="text-[#3b82f6] font-mono px-2 py-0.5 bg-[#0e0e13] rounded border border-[#20202a]">
                {testRun.file || 'N/A'}
              </code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI Root Cause Button */}
            {(isFailed || testRun.status === 'flaky' || testRun.error || aiAnalysis) && (
              <button
                onClick={() => {
                  if (!aiAnalysis) {
                    handleTriggerAiAnalysis(false);
                  } else {
                    setActiveTab('overview');
                  }
                }}
                disabled={aiLoading}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50 ${
                  aiAnalysis
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white animate-pulse'
                }`}
              >
                <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-xs`}></i>
                <span>
                  {aiLoading
                    ? 'Diagnosing...'
                    : aiAnalysis
                    ? `AI Diagnosis (${aiAnalysis.category || 'Ready'})`
                    : '🤖 AI Root Cause & Fix'}
                </span>
              </button>
            )}

            {traceArtifacts.length > 0 && (
              <button
                onClick={() => handleOpenTrace(traceArtifacts[0].url, traceArtifacts[0].name)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <i className="fas fa-play-circle text-xs"></i> Inspect Trace Viewer
              </button>
            )}
            <span className="text-xs bg-[#0e0e13] border border-[#20202a] px-3 py-1.5 rounded-xl font-mono text-[#f4f4f7]">
              Duration: <strong className="text-[#3b82f6]">{testRun.duration}ms</strong>
            </span>
            <span className="text-xs bg-[#0e0e13] border border-[#20202a] px-3 py-1.5 rounded-xl font-mono text-[#9a9aa5]">
              Retries: <strong className="text-[#f4f4f7]">{testRun.retries || 0}</strong>
            </span>
            {startTime && (
              <span className="text-xs bg-[#0e0e13] border border-[#20202a] px-3 py-1.5 rounded-xl text-[#9a9aa5]">
                {new Date(startTime).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#20202a]">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: 'fa-info-circle' },
            ...(isFailed || testRun.status === 'flaky' || testRun.error || aiAnalysis
              ? [{ key: 'ai', label: 'AI Root Cause & Fix', icon: 'fa-wand-magic-sparkles' }]
              : []),
            { key: 'steps', label: `Execution Steps (${suiteTests.length > 0 ? suiteTests.length : steps.length})`, icon: 'fa-list-ol' },
            { key: 'artifacts', label: `Artifacts & Media (${artifacts.length})`, icon: 'fa-photo-video' },
            { key: 'metrics', label: 'Performance Analytics', icon: 'fa-chart-line' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setSearchParams({ tab: tab.key });
              }}
              className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Total Suite Tests</p>
              <p className="text-2xl font-extrabold text-[#f4f4f7] mt-1">{suiteTests.length || 1}</p>
            </div>
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Passed Steps</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {steps.filter((s) => s.status === 'passed').length}
              </p>
            </div>
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Failed Steps</p>
              <p className="text-2xl font-extrabold text-red-400 mt-1">
                {steps.filter((s) => s.status === 'failed').length}
              </p>
            </div>
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#9a9aa5] uppercase">Execution Duration</p>
              <p className="text-2xl font-extrabold text-[#3b82f6] mt-1">{testRun.duration}ms</p>
            </div>
          </div>

          {/* AI Root Cause & Fix Diagnostic Card or Callout */}
          {aiAnalysis && (
            <AiAnalysisCard
              analysis={aiAnalysis}
              loading={aiLoading}
              onRegenerate={() => handleTriggerAiAnalysis(true)}
            />
          )}

          {aiLoading && !aiAnalysis && (
            <AiAnalysisCard analysis={null} loading={true} />
          )}

          {aiError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-red-400">
              <div className="flex items-center gap-2">
                <i className="fas fa-circle-exclamation"></i>
                <span>{aiError}</span>
              </div>
              <button
                onClick={() => handleTriggerAiAnalysis(true)}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-white font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {!aiAnalysis && !aiLoading && (isFailed || testRun.status === 'flaky' || testRun.error) && (
            <div className="bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-lg shadow-inner shrink-0">
                  <i className="fas fa-wand-magic-sparkles"></i>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                    <span>Diagnose Failure Root Cause & Get Instant Fix</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      AI Powered
                    </span>
                  </h3>
                  <p className="text-xs text-[#9a9aa5] mt-1 leading-relaxed">
                    Automatically decompile error logs, evaluate locator drift or hydration race conditions, and generate verified drop-in Playwright code patches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTriggerAiAnalysis(false)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 shrink-0"
              >
                <i className="fas fa-bolt text-xs"></i>
                <span>Run AI Diagnosis</span>
              </button>
            </div>
          )}

          {/* List of Tests in this Test Suite */}
          <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20202a]">
              <div>
                <h3 className="text-lg font-semibold text-[#f4f4f7]">
                  Tests in Suite ({testRun.file || testRun.title})
                </h3>
                <p className="text-xs text-[#9a9aa5]">All test cases executed within this test suite file</p>
              </div>
              <span className="text-xs bg-[#0e0e13] text-[#3b82f6] px-3 py-1 rounded-full font-mono font-semibold">
                {suiteTests.length} test cases
              </span>
            </div>

            {suiteTests.length > 0 ? (
              <div className="divide-y divide-[#20202a]">
                {suiteTests.map((t) => {
                  const isCurrent = t.id === testRun.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl flex items-center justify-between transition-colors ${
                        isCurrent ? 'bg-[#3b82f6]/10 border border-[#3b82f6]/30' : 'hover:bg-[#0e0e13]/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            t.status === 'passed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : t.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {t.status}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[#f4f4f7] truncate">
                            {t.name || t.title}
                          </p>
                          <p className="text-xs text-[#9a9aa5] font-mono mt-0.5">
                            {t.file || testRun.file} • {t.duration}ms
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {isCurrent ? (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-semibold border border-emerald-500/20">
                            Currently Viewing
                          </span>
                        ) : (
                          <Link
                            to={`/tests/${t.id}?tab=steps`}
                            className="px-3 py-1.5 bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/50 text-[#3b82f6] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                          >
                            Inspect Details <i className="fas fa-arrow-right text-[10px]"></i>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#9a9aa5]">
                Single test case in this suite.
              </div>
            )}
          </div>

          {/* Terminal Logs */}
          {testRun.terminalOutput && testRun.terminalOutput.length > 0 && (
            <TerminalOutput lines={testRun.terminalOutput} />
          )}
        </div>
      )}

      {/* Tab: AI Root Cause & Fix */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {aiAnalysis ? (
            <AiAnalysisCard
              analysis={aiAnalysis}
              loading={aiLoading}
              onRegenerate={() => handleTriggerAiAnalysis(true)}
            />
          ) : (
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 inline-flex items-center justify-center text-2xl shadow-inner">
                <i className="fas fa-wand-magic-sparkles"></i>
              </span>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-[#f4f4f7]">No AI Diagnosis Generated Yet</h3>
                <p className="text-xs text-[#9a9aa5] mt-1.5">
                  Launch an automated root cause diagnosis to classify the failure, identify locator drift or race conditions, and receive a verified code fix.
                </p>
              </div>
              <button
                onClick={() => handleTriggerAiAnalysis(false)}
                disabled={aiLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg inline-flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                <span>{aiLoading ? 'Analyzing Test Failure...' : 'Analyze with AI Now'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Execution Steps */}
      {activeTab === 'steps' && (
        <TestStepViewer
          steps={steps}
          suiteTests={suiteTests}
          currentTestTitle={testRun.name || testRun.title}
          onOpenTrace={
            traceArtifacts.length > 0
              ? () => handleOpenTrace(traceArtifacts[0].url, traceArtifacts[0].name)
              : undefined
          }
          onOpenStackTrace={handleOpenStackTrace}
        />
      )}

      {/* Tab 3: Artifacts */}
      {activeTab === 'artifacts' && (
        <div className="space-y-6">
          <ScreenshotGallery artifacts={artifacts} />

          {traceArtifacts.length > 0 && (
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
              <h3 className="text-base font-semibold text-[#f4f4f7] mb-4 flex items-center gap-2">
                <i className="fas fa-play-circle text-[#3b82f6]"></i> Playwright Trace Files
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {traceArtifacts.map((art) => {
                  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
                  const authUrl = token && !art.url.includes('token=')
                    ? `${art.url}${art.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
                    : art.url;
                  return (
                    <div key={art.id} className="bg-[#0e0e13] border border-[#20202a] rounded-xl p-4 space-y-3">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 flex items-center justify-center text-xs flex-shrink-0">
                          <i className="fas fa-file-archive"></i>
                        </span>
                        <p className="text-xs font-medium text-[#f4f4f7] truncate">{art.name}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleOpenTrace(art.url, art.name)}
                          className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-lg transition-opacity flex-1 inline-flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <i className="fas fa-play-circle text-xs"></i> Inspect In Dashboard
                        </button>
                        <a
                          href={authUrl}
                          download={art.name}
                          className="p-1.5 bg-[#20202a] hover:bg-[#252535] text-[#9a9aa5] hover:text-[#f4f4f7] border border-[#30303f] rounded-lg text-xs transition-colors"
                          title="Download ZIP"
                        >
                          <i className="fas fa-download"></i>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {logArtifacts.length > 0 && (
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
              <h3 className="text-base font-semibold text-[#f4f4f7] mb-4 flex items-center gap-2">
                <i className="fas fa-file-alt text-[#3b82f6]"></i> Log Artifact Downloads ({logArtifacts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {logArtifacts.map((art) => {
                  const authUrl = getAuthUrl(art.url, art.path);
                  return (
                    <div key={art.id} className="bg-[#0e0e13] border border-[#20202a] rounded-xl p-4 space-y-3">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 flex items-center justify-center text-xs flex-shrink-0">
                          <i className="fas fa-file-code"></i>
                        </span>
                        <p className="text-xs font-medium text-[#f4f4f7] truncate">{art.name}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={authUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-lg transition-opacity flex-1 inline-flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <i className="fas fa-external-link-alt text-[10px]"></i> View Log
                        </a>
                        <a
                          href={authUrl}
                          download={art.name}
                          className="p-1.5 bg-[#20202a] hover:bg-[#252535] text-[#9a9aa5] hover:text-[#f4f4f7] border border-[#30303f] rounded-lg text-xs transition-colors"
                          title="Download Log"
                        >
                          <i className="fas fa-download"></i>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {otherArtifacts.length > 0 && (
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
              <h3 className="text-base font-semibold text-[#f4f4f7] mb-4 flex items-center gap-2">
                <i className="fas fa-paperclip text-[#3b82f6]"></i> Other Artifacts & Attachments ({otherArtifacts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {otherArtifacts.map((art) => {
                  const authUrl = getAuthUrl(art.url, art.path);
                  return (
                    <div key={art.id} className="bg-[#0e0e13] border border-[#20202a] rounded-xl p-4 space-y-3">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 flex items-center justify-center text-xs flex-shrink-0">
                          <i className="fas fa-file-alt"></i>
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#f4f4f7] truncate">{art.name || 'Artifact'}</p>
                          <span className="text-[10px] text-[#9a9aa5] uppercase">{art.type || 'attachment'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={authUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-lg transition-opacity flex-1 inline-flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <i className="fas fa-external-link-alt text-[10px]"></i> View File
                        </a>
                        <a
                          href={authUrl}
                          download={art.name}
                          className="p-1.5 bg-[#20202a] hover:bg-[#252535] text-[#9a9aa5] hover:text-[#f4f4f7] border border-[#30303f] rounded-lg text-xs transition-colors"
                          title="Download"
                        >
                          <i className="fas fa-download"></i>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {artifacts.length === 0 && (
            <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-8 text-center text-[#9a9aa5]">
              No artifacts recorded for this test run.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Performance Analytics */}
      {activeTab === 'metrics' && <MetricsDashboard buildId={effectiveBuildId} />}

      {/* Trace Viewer Modal */}
      <TraceViewerModal
        isOpen={traceModalOpen}
        onClose={() => setTraceModalOpen(false)}
        traceUrl={selectedTraceUrl || ''}
        traceName={selectedTraceName}
        testTitle={testRun.title || testRun.name}
      />

      {/* Stack Trace Modal */}
      {stackTraceModalData && (
        <StackTraceModal
          isOpen={stackTraceModalOpen}
          onClose={() => setStackTraceModalOpen(false)}
          error={stackTraceModalData.error}
          testTitle={stackTraceModalData.title}
        />
      )}
    </div>
  );
};

export default TestDetails;
