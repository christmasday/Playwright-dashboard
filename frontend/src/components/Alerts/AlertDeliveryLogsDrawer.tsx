/**
 * Alert Delivery Logs Drawer
 * View real-time audit logs of Slack, Teams, and Discord alert dispatch attempts.
 */

import React from 'react';
import type { AlertDeliveryLog } from '../../types/api';

interface AlertDeliveryLogsDrawerProps {
  logs: AlertDeliveryLog[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const PROVIDER_ICONS: Record<string, { icon: string; color: string }> = {
  slack: { icon: 'fab fa-slack', color: '#36C5F0' },
  teams: { icon: 'fab fa-microsoft', color: '#6264A7' },
  discord: { icon: 'fab fa-discord', color: '#5865F2' },
  webhook: { icon: 'fas fa-link', color: '#3b82f6' },
};

const AlertDeliveryLogsDrawer: React.FC<AlertDeliveryLogsDrawerProps> = ({
  logs,
  loading,
  isOpen,
  onClose,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#101017] border-l border-[#20202a] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Delivery Logs"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#20202a] flex items-center justify-between bg-[#0e0e13]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-history text-sm"></i>
            </span>
            <div>
              <h3 className="text-base font-bold text-[#f4f4f7]">Delivery Audit Logs</h3>
              <p className="text-[11px] text-[#9a9aa5]">
                Recent outgoing Slack, Teams & Discord notifications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Logs"
              className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs ${loading ? 'animate-spin' : ''}`}></i>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="py-20 text-center text-[#9a9aa5] space-y-3">
              <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs">Loading delivery logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-[#9a9aa5] space-y-3 bg-[#08080a] border border-[#20202a] rounded-2xl p-6">
              <i className="fas fa-inbox text-3xl text-[#5e5e68]"></i>
              <div className="text-sm font-semibold text-[#f4f4f7]">No Alert Activity Yet</div>
              <p className="text-xs text-[#9a9aa5]">
                Alert delivery records and response codes will appear here once your builds run or test notifications are dispatched.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const prov = PROVIDER_ICONS[log.provider] || PROVIDER_ICONS.webhook;
              const isSuccess = log.status === 'success';

              return (
                <div
                  key={log.id}
                  className="p-3.5 bg-[#08080a] border border-[#20202a] rounded-xl hover:border-[#3b82f6]/30 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className={`${prov.icon} text-sm`} style={{ color: prov.color }}></i>
                      <span className="text-xs font-bold text-[#f4f4f7]">
                        {log.destination_name || log.provider.toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isSuccess
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {log.status_code ? `HTTP ${log.status_code}` : log.status}
                    </span>
                  </div>

                  {log.build_name && (
                    <div className="text-[11px] text-[#9a9aa5] flex items-center gap-1.5">
                      <i className="fas fa-cube text-[10px] text-[#5e5e68]"></i>
                      <span>Build: <strong className="text-[#f4f4f7]">{log.build_name}</strong></span>
                    </div>
                  )}

                  {log.error_message && (
                    <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-mono break-all">
                      {log.error_message}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#5e5e68] pt-1 border-t border-[#14141b]">
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    <span>{log.latency_ms ? `${log.latency_ms}ms latency` : ''}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDeliveryLogsDrawer;
