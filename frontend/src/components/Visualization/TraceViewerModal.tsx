import React, { useState, useEffect } from 'react';

interface TraceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceUrl: string;
  traceName?: string;
  testTitle?: string;
}

const TraceViewerModal: React.FC<TraceViewerModalProps> = ({
  isOpen,
  onClose,
  traceUrl,
  traceName = 'trace.zip',
  testTitle,
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !traceUrl) return null;

  const getToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  const getAuthTraceUrl = (url: string) => {
    const token = getToken();
    if (token && !url.includes('token=')) {
      return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return url;
  };

  const authenticatedTraceUrl = getAuthTraceUrl(traceUrl);
  const playrightWebTraceUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(authenticatedTraceUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`bg-[#0e0e13] border border-[#20202a] rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-full max-w-7xl h-[90vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#14141b] border-b border-[#20202a] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-play-circle text-sm"></i>
            </span>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#f4f4f7] truncate">
                  Playwright Trace Inspector
                </h3>
                {testTitle && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20 truncate max-w-xs">
                    {testTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9a9aa5] font-mono truncate">{traceName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <a
              href={playrightWebTraceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#20202a] hover:bg-[#252535] text-[#f4f4f7] text-xs font-semibold rounded-xl border border-[#30303f] transition-colors inline-flex items-center gap-1.5"
              title="Open in official trace.playwright.dev web tab"
            >
              <i className="fas fa-external-link-alt text-[10px]"></i> Open Web Tab
            </a>

            <a
              href={authenticatedTraceUrl}
              download={traceName}
              className="px-3 py-1.5 bg-[#20202a] hover:bg-[#252535] text-[#f4f4f7] text-xs font-semibold rounded-xl border border-[#30303f] transition-colors inline-flex items-center gap-1.5"
              title="Download raw .zip trace file"
            >
              <i className="fas fa-download text-[10px]"></i> Download .ZIP
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-xl bg-[#20202a] hover:bg-[#252535] text-[#9a9aa5] hover:text-[#f4f4f7] border border-[#30303f] flex items-center justify-center text-xs transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center text-xs transition-colors"
              title="Close Trace Viewer (ESC)"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Content - Embedded Iframe */}
        <div className="relative flex-1 bg-[#08080a] w-full h-full overflow-hidden">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e0e13] text-[#9a9aa5] space-y-3">
              <i className="fas fa-spinner fa-spin text-3xl text-[#3b82f6]"></i>
              <p className="text-xs font-medium text-[#f4f4f7]">Loading Playwright Trace Viewer Engine...</p>
              <p className="text-[11px] text-[#5e5e68]">Retrieving execution timeline, DOM snapshots &amp; network logs</p>
            </div>
          )}

          <iframe
            src={playrightWebTraceUrl}
            onLoad={() => setIframeLoading(false)}
            className="w-full h-full border-none"
            title="Playwright Trace Viewer"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
};

export default TraceViewerModal;
