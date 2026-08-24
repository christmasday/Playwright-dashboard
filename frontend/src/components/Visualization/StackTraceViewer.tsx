/**
 * Advanced Stack Trace & Assertion Diff Viewer
 * Interactive frame navigation, code frame highlighting, diff inspection, and 1-click IDE deep linking.
 */

import React, { useState, useMemo } from 'react';
import { parseStackTrace, getIdeLinks, StackFrame } from '../../utils/stackTraceParser';

interface ErrorInfo {
  message: string;
  stack?: string;
  location?: string;
  className?: string;
  sourceCode?: string;
}

interface StackTraceViewerProps {
  error: ErrorInfo;
  showSourceCode?: boolean;
}

const StackTraceViewer: React.FC<StackTraceViewerProps> = ({ error, showSourceCode = true }) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'diff' | 'raw'>('formatted');
  const [showFullStack, setShowFullStack] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Parse diagnostics
  const diagnostics = useMemo(() => {
    return parseStackTrace(error.message, error.stack);
  }, [error.message, error.stack]);

  const activeFrames = showFullStack ? diagnostics.frames : diagnostics.userCodeFrames.length > 0 ? diagnostics.userCodeFrames : diagnostics.frames;

  const selectedFrame: StackFrame | undefined = useMemo(() => {
    if (selectedFrameId) {
      return diagnostics.frames.find((f) => f.id === selectedFrameId);
    }
    return diagnostics.primaryUserFrame;
  }, [selectedFrameId, diagnostics]);

  const ideLinks = useMemo(() => {
    const targetFile = selectedFrame?.file || error.location;
    const targetLine = selectedFrame?.line;
    const targetCol = selectedFrame?.column;
    return getIdeLinks(targetFile, targetLine, targetCol);
  }, [selectedFrame, error.location]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getCategoryBadge = () => {
    switch (diagnostics.category) {
      case 'timeout':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'strict_mode':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'assertion':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'element_not_found':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'browser_crash':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      default:
        return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
  };

  return (
    <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden shadow-xl space-y-0">
      {/* Header Bar */}
      <div className="p-5 border-b border-[#20202a] bg-[#14141b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="text-base font-bold text-[#f4f4f7]">Test Failure Diagnostics & Stack Trace</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getCategoryBadge()}`}>
              {diagnostics.categoryLabel}
            </span>
          </div>
          {error.location && (
            <p className="text-xs text-[#9a9aa5] font-mono flex items-center gap-1.5">
              <span>Spec:</span>
              <code className="text-[#60a5fa]">{error.location}</code>
            </p>
          )}
        </div>

        {/* Action Controls & IDE Deep Links */}
        <div className="flex flex-wrap items-center gap-2">
          {ideLinks && (
            <a
              href={ideLinks.vscode}
              className="px-3 py-1.5 bg-[#0e0e13] hover:bg-[#1a1a24] text-[#60a5fa] border border-[#3b82f6]/30 hover:border-[#3b82f6]/60 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              title="Open failing line in VS Code"
            >
              <i className="fas fa-code text-xs"></i> VS Code
            </a>
          )}
          {ideLinks && (
            <a
              href={ideLinks.cursor}
              className="px-3 py-1.5 bg-[#0e0e13] hover:bg-[#1a1a24] text-[#a78bfa] border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/60 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              title="Open failing line in Cursor"
            >
              <i className="fas fa-terminal text-xs"></i> Cursor
            </a>
          )}
          <button
            onClick={() => handleCopy(`${error.message}\n\n${error.stack || ''}`, 'trace')}
            className="px-3 py-1.5 bg-[#0e0e13] hover:bg-[#1a1a24] text-[#f4f4f7] border border-[#20202a] hover:border-[#3b82f6]/40 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <i className={`fas fa-${copied === 'trace' ? 'check text-emerald-400' : 'copy'}`}></i>
            {copied === 'trace' ? 'Copied' : 'Copy Trace'}
          </button>
        </div>
      </div>

      {/* Playwright Diagnostic Advice Banner (if applicable) */}
      {diagnostics.categoryAdvice && (
        <div className="px-5 py-3 bg-[#0e0e13]/80 border-b border-[#20202a] flex items-start gap-2.5 text-xs">
          <i className="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0"></i>
          <div>
            <strong className="text-[#f4f4f7] font-semibold">Debugging Tip: </strong>
            <span className="text-[#9a9aa5]">{diagnostics.categoryAdvice}</span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="px-5 pt-3 border-b border-[#20202a] bg-[#121218] flex items-center justify-between">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('formatted')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'formatted'
                ? 'border-[#3b82f6] text-[#3b82f6]'
                : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
          >
            <i className="fas fa-layer-group text-xs"></i>
            <span>Call Stack ({activeFrames.length})</span>
          </button>

          {diagnostics.assertionDiff && (
            <button
              onClick={() => setActiveTab('diff')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'diff'
                  ? 'border-[#3b82f6] text-[#3b82f6]'
                  : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
              }`}
            >
              <i className="fas fa-columns text-xs"></i>
              <span>Assertion Diff</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('raw')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'raw'
                ? 'border-[#3b82f6] text-[#3b82f6]'
                : 'border-transparent text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
          >
            <i className="fas fa-align-left text-xs"></i>
            <span>Raw Stack</span>
          </button>
        </div>

        {activeTab === 'formatted' && diagnostics.frames.length > 0 && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-[11px] text-[#9a9aa5]">Filter:</span>
            <button
              onClick={() => setShowFullStack(!showFullStack)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                showFullStack
                  ? 'bg-[#3b82f6]/20 text-[#60a5fa] border-[#3b82f6]/40'
                  : 'bg-[#0e0e13] text-[#9a9aa5] border-[#20202a] hover:text-[#f4f4f7]'
              }`}
            >
              {showFullStack ? 'Showing All Frames' : 'User Code Only'}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: Formatted Stack Frames & Code Frame */}
      {activeTab === 'formatted' && (
        <div className="p-5 space-y-5">
          {/* Primary Error Message */}
          <div>
            <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider mb-2">
              Assertion / Exception Message
            </h4>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <pre className="text-xs text-red-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {error.message}
              </pre>
            </div>
          </div>

          {/* Inline Code Snippet / Frame */}
          {(diagnostics.codeSnippet || (showSourceCode && error.sourceCode)) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider">
                  Failing Code Frame
                </h4>
                {selectedFrame?.line && (
                  <span className="text-xs font-mono text-[#60a5fa]">
                    Line {selectedFrame.line}:{selectedFrame.column || 1}
                  </span>
                )}
              </div>
              <div className="bg-[#08080a] border border-[#20202a] rounded-xl overflow-hidden">
                {diagnostics.codeSnippet ? (
                  <div className="divide-y divide-[#14141b] font-mono text-xs">
                    {diagnostics.codeSnippet.map((s, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center px-4 py-1.5 transition-colors ${
                          s.isHighlighted
                            ? 'bg-red-500/20 text-red-200 border-l-4 border-red-500 font-semibold'
                            : 'text-[#9a9aa5] hover:bg-[#101017]'
                        }`}
                      >
                        <span className="w-10 text-right pr-4 text-[#5e5e68] select-none font-mono text-[11px]">
                          {s.lineNumber}
                        </span>
                        <pre className="overflow-x-auto whitespace-pre">{s.content}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-[#f4f4f7] leading-relaxed">
                      {error.sourceCode}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stack Frames List */}
          <div>
            <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider mb-2">
              Stack Trace Frames ({activeFrames.length})
            </h4>
            {activeFrames.length > 0 ? (
              <div className="space-y-2">
                {activeFrames.map((frame) => {
                  const isSelected = selectedFrame?.id === frame.id;
                  const frameIde = getIdeLinks(frame.file, frame.line, frame.column);

                  return (
                    <div
                      key={frame.id}
                      onClick={() => setSelectedFrameId(frame.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#3b82f6]/60 bg-[#3b82f6]/5 shadow-sm'
                          : frame.isUserCode
                          ? 'border-[#20202a] bg-[#0e0e13] hover:border-[#3b82f6]/30'
                          : 'border-[#20202a]/60 bg-[#0a0a0e]/40 opacity-75 hover:opacity-100 hover:border-[#30303f]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                              frame.isUserCode
                                ? 'bg-[#3b82f6]/20 text-[#60a5fa]'
                                : 'bg-[#20202a] text-[#5e5e68]'
                            }`}
                          >
                            <i className="fas fa-code"></i>
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#f4f4f7] truncate">
                                {frame.functionName}
                              </span>
                              {frame.isUserCode && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  User Code
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#9a9aa5] font-mono truncate mt-0.5">
                              {frame.file}
                              {frame.line && <span className="text-[#60a5fa]">:{frame.line}</span>}
                              {frame.column && <span className="text-[#9a9aa5]">:{frame.column}</span>}
                            </p>
                          </div>
                        </div>

                        {frameIde && (
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={frameIde.vscode}
                              className="px-2 py-1 bg-[#14141b] hover:bg-[#20202a] text-[#60a5fa] border border-[#20202a] rounded-lg text-[10px] font-semibold transition-colors"
                              title="Open in VS Code"
                            >
                              VS Code
                            </a>
                            <button
                              onClick={() => handleCopy(`${frame.file}:${frame.line || 1}`, frame.id)}
                              className="p-1 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs"
                              title="Copy file path"
                            >
                              <i className={`fas fa-${copied === frame.id ? 'check text-emerald-400' : 'copy'}`}></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-[#0e0e13] border border-[#20202a] rounded-xl text-center text-xs text-[#9a9aa5]">
                No frames found. Switch to Full Call Stack view above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Assertion Diff (Expected vs Received) */}
      {activeTab === 'diff' && diagnostics.assertionDiff && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected */}
            <div className="bg-[#0e0e13] border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-check-circle"></i> Expected
                </span>
                <button
                  onClick={() => handleCopy(diagnostics.assertionDiff?.expected || '', 'expected')}
                  className="text-xs text-[#9a9aa5] hover:text-[#f4f4f7]"
                >
                  {copied === 'expected' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs font-mono text-emerald-300 bg-[#08080a] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {diagnostics.assertionDiff.expected || '(None)'}
              </pre>
            </div>

            {/* Received */}
            <div className="bg-[#0e0e13] border border-red-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-times-circle"></i> Received
                </span>
                <button
                  onClick={() => handleCopy(diagnostics.assertionDiff?.received || '', 'received')}
                  className="text-xs text-[#9a9aa5] hover:text-[#f4f4f7]"
                >
                  {copied === 'received' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs font-mono text-red-300 bg-[#08080a] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {diagnostics.assertionDiff.received || '(None)'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Raw Stack Trace */}
      {activeTab === 'raw' && (
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#9a9aa5] uppercase tracking-wider">
              Raw Unformatted Output
            </h4>
            <button
              onClick={() => handleCopy(`${error.message}\n\n${error.stack || ''}`, 'raw')}
              className="text-xs text-[#3b82f6] hover:underline font-semibold"
            >
              {copied === 'raw' ? '✓ Copied' : 'Copy Raw Text'}
            </button>
          </div>
          <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl overflow-x-auto">
            <pre className="text-xs font-mono text-[#9a9aa5] leading-relaxed whitespace-pre">
              {error.stack || error.message}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default StackTraceViewer;
