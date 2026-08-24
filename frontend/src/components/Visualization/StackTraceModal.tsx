import React, { useEffect } from 'react';
import StackTraceViewer from './StackTraceViewer';

interface ErrorInfo {
  message: string;
  stack?: string;
  location?: string;
  className?: string;
  sourceCode?: string;
}

interface StackTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorInfo;
  testTitle?: string;
}

const StackTraceModal: React.FC<StackTraceModalProps> = ({
  isOpen,
  onClose,
  error,
  testTitle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e0e13] border border-[#20202a] rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#14141b] border-b border-[#20202a] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <i className="fas fa-bug text-sm"></i>
            </span>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#f4f4f7] truncate">
                  Stack Trace &amp; Failure Diagnostics
                </h3>
                {testTitle && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 truncate max-w-xs">
                    {testTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9a9aa5] font-mono truncate">{error.location || 'Test Failure'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center text-xs transition-colors"
            title="Close Stack Trace (ESC)"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0e0e13]">
          <StackTraceViewer error={error} />
        </div>
      </div>
    </div>
  );
};

export default StackTraceModal;
