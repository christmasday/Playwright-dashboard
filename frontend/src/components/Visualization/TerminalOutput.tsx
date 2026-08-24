import React, { useState } from 'react';

interface TerminalLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  height?: string;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ lines, height = '400px' }) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredLines = lines.filter((line) => {
    const matchesFilter = filter === 'all' || line.level === filter;
    const matchesSearch =
      searchQuery === '' || line.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopy = () => {
    const terminalContent = document.getElementById('terminal-log-body');
    if (terminalContent) {
      navigator.clipboard.writeText(terminalContent.textContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'debug':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-[#9a9aa5] bg-[#20202a] border-transparent';
    }
  };

  return (
    <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20202a]">
        <div>
          <h3 className="text-lg font-semibold text-[#f4f4f7]">Console & Terminal Logs</h3>
          <p className="text-xs text-[#9a9aa5]">Captured stdout, stderr, and execution logs</p>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-[#0e0e13] border border-[#20202a] hover:border-[#3b82f6]/50 rounded-lg text-xs font-semibold text-[#3b82f6] transition-colors flex items-center gap-1.5"
        >
          <i className={`fas fa-${copied ? 'check text-emerald-400' : 'copy'}`}></i>
          {copied ? 'Copied' : 'Copy Logs'}
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="w-full sm:w-44 px-3 py-2 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
        >
          <option value="all">All Levels ({lines.length})</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <input
          type="text"
          placeholder="Filter log messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full flex-1 px-4 py-2 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
        />
      </div>

      <div
        className="bg-[#08080a] border border-[#20202a] rounded-xl overflow-hidden flex flex-col"
        style={{ height }}
      >
        <div className="bg-[#121218] px-4 py-2 border-b border-[#20202a] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-[11px] font-mono text-[#5e5e68]">bash / stdout</span>
        </div>

        <div id="terminal-log-body" className="p-4 overflow-y-auto font-mono text-xs space-y-2 flex-1">
          {filteredLines.length > 0 ? (
            filteredLines.map((line, idx) => (
              <div key={idx} className="flex items-start space-x-3 leading-relaxed">
                <span className="text-[#5e5e68] select-none whitespace-nowrap">
                  [{new Date(line.timestamp).toLocaleTimeString()}]
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getLevelBadge(
                    line.level
                  )}`}
                >
                  {line.level}
                </span>
                <span className="text-[#f4f4f7] flex-1 break-all whitespace-pre-wrap">
                  {line.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-[#5e5e68] py-8 font-sans text-xs">
              No log messages matching filter criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalOutput;
