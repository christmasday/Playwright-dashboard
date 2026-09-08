import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const [loadingStatus, setLoadingStatus] = useState<'downloading' | 'initializing' | 'ready' | 'error'>('downloading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [traceBlob, setTraceBlob] = useState<Blob | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryTimerRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  const getAuthTraceUrl = useCallback((url: string) => {
    if (!url) return '';
    let fileUrl = url;
    const token = getToken();
    if (token && !fileUrl.includes('token=')) {
      fileUrl = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return fileUrl;
  }, []);

  const authenticatedTraceUrl = getAuthTraceUrl(traceUrl);

  // Send the trace Blob to trace.playwright.dev via postMessage
  const postTraceBlob = useCallback((blob: Blob) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        {
          method: 'load',
          params: {
            trace: blob,
          },
        },
        'https://trace.playwright.dev'
      );
    } catch (err) {
      console.error('Failed to postMessage trace blob to iframe:', err);
    }
  }, []);

  // Fetch the trace artifact from the server as a Blob
  useEffect(() => {
    if (!isOpen || !traceUrl) return;

    let isCancelled = false;
    setLoadingStatus('downloading');
    setErrorMessage(null);
    setTraceBlob(null);

    // Clear any existing retry timers
    retryTimerRef.current.forEach(clearTimeout);
    retryTimerRef.current = [];

    const fetchUrl = authenticatedTraceUrl;

    fetch(fetchUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Trace artifact not found on server`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (isCancelled) return;
        setTraceBlob(blob);
        setLoadingStatus('initializing');

        // Schedule multiple postMessage attempts to ensure the trace viewer receives it
        // even if its listener initializes slightly after the iframe load event
        const delays = [400, 800, 1500, 2500];
        delays.forEach((delay) => {
          const timer = setTimeout(() => {
            if (!isCancelled) {
              postTraceBlob(blob);
            }
          }, delay);
          retryTimerRef.current.push(timer);
        });
      })
      .catch((err) => {
        if (isCancelled) return;
        setErrorMessage(err.message || 'Failed to download trace file');
        setLoadingStatus('error');
      });

    return () => {
      isCancelled = true;
      retryTimerRef.current.forEach(clearTimeout);
      retryTimerRef.current = [];
    };
  }, [isOpen, traceUrl, authenticatedTraceUrl, postTraceBlob]);

  // When the iframe finishes loading, immediately send the blob if ready
  const handleIframeLoad = () => {
    if (traceBlob) {
      postTraceBlob(traceBlob);
      // Wait a moment for rendering before hiding loader
      setTimeout(() => {
        setLoadingStatus('ready');
      }, 600);
    } else {
      setLoadingStatus('initializing');
    }
  };

  const handleOpenWebTab = () => {
    window.open('https://trace.playwright.dev', '_blank', 'noopener,noreferrer');
  };

  if (!isOpen || !traceUrl) return null;

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
            <button
              onClick={handleOpenWebTab}
              className="px-3 py-1.5 bg-[#20202a] hover:bg-[#252535] text-[#f4f4f7] text-xs font-semibold rounded-xl border border-[#30303f] transition-colors inline-flex items-center gap-1.5"
              title="Open trace.playwright.dev in new tab"
            >
              <i className="fas fa-external-link-alt text-[10px]"></i> Open Web Tab
            </button>

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
          {loadingStatus === 'error' ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e0e13] text-[#9a9aa5] p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-lg">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h4 className="text-sm font-semibold text-[#f4f4f7]">Unable to Load Trace File</h4>
              <p className="text-xs text-[#9a9aa5] max-w-md">
                {errorMessage || 'The trace file could not be loaded from disk or may have expired.'}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={authenticatedTraceUrl}
                  download={traceName}
                  className="px-3.5 py-1.5 bg-[#3b82f6] text-white text-xs font-semibold rounded-xl transition-opacity shadow-sm inline-flex items-center gap-1.5"
                >
                  <i className="fas fa-download text-xs"></i> Download .ZIP Directly
                </a>
                <button
                  onClick={() => {
                    setLoadingStatus('downloading');
                    setErrorMessage(null);
                  }}
                  className="px-3.5 py-1.5 bg-[#20202a] text-[#f4f4f7] text-xs font-semibold rounded-xl border border-[#30303f] hover:bg-[#252535] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {loadingStatus !== 'ready' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e0e13] text-[#9a9aa5] space-y-3">
                  <i className="fas fa-spinner fa-spin text-3xl text-[#3b82f6]"></i>
                  <p className="text-xs font-medium text-[#f4f4f7]">
                    {loadingStatus === 'downloading'
                      ? 'Downloading Playwright Trace Archive...'
                      : 'Transferring Trace to Viewer Engine...'}
                  </p>
                  <p className="text-[11px] text-[#5e5e68]">
                    Retrieving execution timeline, DOM snapshots &amp; network logs in-memory
                  </p>
                </div>
              )}

              <iframe
                ref={iframeRef}
                src="https://trace.playwright.dev/"
                onLoad={handleIframeLoad}
                className="w-full h-full border-none"
                title="Playwright Trace Viewer"
                allow="clipboard-read; clipboard-write"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TraceViewerModal;
