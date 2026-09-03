/**
 * AI Root Cause & Fix Suggestions Diagnostic Card
 * Renders categorized failure analysis, root cause mechanics,
 * side-by-side Playwright code diff, and 1-click copy fix.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export interface AiAnalysisData {
  category:
    | 'SELECTOR_DRIFT'
    | 'HYDRATION_RACE'
    | 'ASSERTION_REGRESSION'
    | 'NETWORK_API_500'
    | 'TIMEOUT_EXCEEDED'
    | 'INFRA_SETUP'
    | string;
  confidenceScore?: number;
  confidence_score?: number;
  summary: string;
  rootCauseDetails?: string;
  root_cause_details?: string;
  suggestedFix?: {
    beforeCode?: string;
    afterCode?: string;
    code?: string;
    explanation?: string;
  };
  suggested_fix?: {
    beforeCode?: string;
    afterCode?: string;
    code?: string;
    explanation?: string;
  };
  preventionTips?: string[];
  prevention_tips?: string[];
  provider?: string;
  model?: string;
  latencyMs?: number;
  latency_ms?: number;
  cached?: boolean;
}

interface AiAnalysisCardProps {
  analysis: AiAnalysisData | null;
  loading?: boolean;
  onRegenerate?: () => void;
  title?: string;
}

export const getCategoryBadge = (category?: string) => {
  const cat = (category || '').toUpperCase();
  switch (cat) {
    case 'SELECTOR_DRIFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <i className="fas fa-crosshairs text-[10px]"></i> Selector Drift / Timeout
        </span>
      );
    case 'HYDRATION_RACE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <i className="fas fa-water text-[10px]"></i> Hydration / Timing Race
        </span>
      );
    case 'ASSERTION_REGRESSION':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <i className="fas fa-scale-unbalanced text-[10px]"></i> Assertion Regression
        </span>
      );
    case 'NETWORK_API_500':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <i className="fas fa-globe text-[10px]"></i> Network / API 500 Error
        </span>
      );
    case 'TIMEOUT_EXCEEDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <i className="fas fa-stopwatch text-[10px]"></i> Timeout Exceeded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <i className="fas fa-circle-exclamation text-[10px]"></i> {category || 'General Failure'}
        </span>
      );
  }
};

const AiAnalysisCard: React.FC<AiAnalysisCardProps> = ({
  analysis,
  loading = false,
  onRegenerate,
  title = 'AI Root Cause & Fix Recommendation',
}) => {
  const [copiedFix, setCopiedFix] = useState(false);
  const [activeDiffTab, setActiveDiffTab] = useState<'after' | 'before'>('after');

  const fix = analysis?.suggestedFix || analysis?.suggested_fix;
  const fixCode = fix?.afterCode || fix?.code || '';
  const beforeCode = fix?.beforeCode || '';
  const rootCause = analysis?.rootCauseDetails || analysis?.root_cause_details;
  const confidence = analysis?.confidenceScore || analysis?.confidence_score || 90;
  const tips = analysis?.preventionTips || analysis?.prevention_tips || [];
  const latency = analysis?.latencyMs || analysis?.latency_ms;

  const handleCopy = () => {
    if (!fixCode) return;
    navigator.clipboard.writeText(fixCode);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2500);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#14141d] to-[#101017] border border-blue-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center animate-pulse">
              <i className="fas fa-wand-magic-sparkles text-lg"></i>
            </div>
            <div>
              <div className="h-4 w-48 bg-blue-500/20 rounded animate-pulse"></div>
              <div className="h-3 w-32 bg-[#20202a] rounded mt-2 animate-pulse"></div>
            </div>
          </div>
          <div className="h-6 w-24 bg-blue-500/20 rounded-full animate-pulse"></div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-full bg-[#20202a] rounded animate-pulse"></div>
          <div className="h-3.5 w-4/5 bg-[#20202a] rounded animate-pulse"></div>
          <div className="h-3.5 w-2/3 bg-[#20202a] rounded animate-pulse"></div>
        </div>

        <div className="h-36 bg-[#0a0a0f] border border-[#20202a] rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-gradient-to-b from-[#14141d] to-[#101017] border border-blue-500/30 hover:border-blue-500/50 rounded-2xl p-6 shadow-2xl transition-all space-y-5">
      {/* Card Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#20202a] pb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <i className="fas fa-wand-magic-sparkles text-base"></i>
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#f4f4f7]">{title}</h3>
              {getCategoryBadge(analysis.category)}
            </div>
            <p className="text-[11px] text-[#9a9aa5] mt-0.5 flex items-center gap-2">
              <span>Confidence: <strong className="text-emerald-400">{confidence}%</strong></span>
              {analysis.provider && (
                <>
                  <span>•</span>
                  <span className="capitalize">
                    Provider: <strong className="text-[#f4f4f7]">{analysis.provider}</strong>
                    {analysis.model ? ` (${analysis.model})` : ''}
                  </span>
                </>
              )}
              {latency !== undefined && (
                <>
                  <span>•</span>
                  <span>{latency}ms</span>
                </>
              )}
              {analysis.cached && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 italic">cached</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <Link
            to="/settings/profile"
            className="px-2.5 py-1.5 bg-[#0a0a0f] hover:bg-[#1c1c26] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-lg text-xs transition-colors flex items-center gap-1.5"
            title="Configure AI Provider & API Key"
          >
            <i className="fas fa-gear text-[11px]"></i>
            <span className="hidden sm:inline">Provider Settings</span>
          </Link>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="px-3 py-1.5 bg-[#0a0a0f] hover:bg-blue-600/20 text-[#9a9aa5] hover:text-blue-400 border border-[#20202a] hover:border-blue-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              title="Re-run AI analysis"
            >
              <i className="fas fa-rotate text-[11px]"></i>
              <span>Re-analyze</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-blue-500/5 border-l-4 border-blue-500 p-4 rounded-r-xl">
        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
          Diagnosis Summary
        </h4>
        <p className="text-sm text-[#f4f4f7] font-medium leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* Root Cause Technical Breakdown */}
      {rootCause && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a9aa5] flex items-center gap-1.5">
            <i className="fas fa-magnifying-glass text-[10px] text-blue-400"></i>
            Root Cause Mechanics
          </h4>
          <p className="text-xs text-[#9a9aa5] leading-relaxed bg-[#0a0a0f] border border-[#20202a] rounded-xl p-3.5">
            {rootCause}
          </p>
        </div>
      )}

      {/* Suggested Fix (Code Diff) */}
      {fix && (fixCode || beforeCode) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <i className="fas fa-code text-[10px]"></i>
                Suggested Fix Code Patch
              </h4>
              {beforeCode && (
                <div className="flex items-center bg-[#0a0a0f] border border-[#20202a] rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setActiveDiffTab('after')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      activeDiffTab === 'after'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                    }`}
                  >
                    After (Fixed)
                  </button>
                  <button
                    onClick={() => setActiveDiffTab('before')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      activeDiffTab === 'before'
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                    }`}
                  >
                    Before (Failing)
                  </button>
                </div>
              )}
            </div>

            {fixCode && (
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <i className={`fas ${copiedFix ? 'fa-check' : 'fa-clipboard'} text-[11px]`}></i>
                <span>{copiedFix ? 'Copied to Clipboard!' : 'Copy Fix Code'}</span>
              </button>
            )}
          </div>

          <div className="relative group">
            <pre className="bg-[#08080c] border border-[#20202a] rounded-xl p-4 text-xs font-mono text-[#f4f4f7] overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              <code>{activeDiffTab === 'after' ? fixCode : beforeCode}</code>
            </pre>
          </div>

          {fix.explanation && (
            <p className="text-xs text-[#9a9aa5] italic bg-[#0a0a0f] border border-[#20202a] rounded-xl p-3">
              💡 <strong>Why this fix works:</strong> {fix.explanation}
            </p>
          )}
        </div>
      )}

      {/* Prevention Tips Checklist */}
      {tips.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#20202a]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#9a9aa5] flex items-center gap-1.5">
            <i className="fas fa-shield-halved text-[10px] text-indigo-400"></i>
            Flakiness Prevention Checklist
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#9a9aa5]">
            {tips.map((tip, idx) => (
              <li
                key={idx}
                className="bg-[#0a0a0f] border border-[#20202a] rounded-xl p-2.5 flex items-start gap-2"
              >
                <i className="fas fa-check-circle text-emerald-400 text-xs mt-0.5"></i>
                <span className="text-[#d0d0d8]">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AiAnalysisCard;
