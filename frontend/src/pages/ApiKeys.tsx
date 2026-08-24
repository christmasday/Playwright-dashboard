/**
 * API Keys Settings Page (any authenticated user)
 * Generate, view, copy and revoke personal API keys used by the reporter.
 */

import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import type { ApiKey } from '../types/api';

const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiService.listApiKeys();
      setKeys(resp.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCopied(false);
    try {
      const resp = await apiService.createApiKey(name.trim());
      setNewKey(resp.data.data.key);
      setName('');
      setShowCreate(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create API key');
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const revoke = async (k: ApiKey) => {
    if (!window.confirm(`Revoke key "${k.name}"? It can no longer be used by the reporter.`)) return;
    setError(null);
    try {
      await apiService.revokeApiKey(k.id);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to revoke API key');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f7]">API Keys</h1>
          <p className="text-sm text-[#9a9aa5] mt-1">
            Generate a key and use it as <code className="text-[#3b82f6]">DASHBOARD_API_KEY</code> in your
            Playwright reporter config.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setNewKey(null);
            setCopied(false);
          }}
          className="px-4 py-2 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
        >
          {showCreate ? 'Cancel' : 'Generate new key'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-4 text-sm bg-[#1a1a22] border border-[#3b82f6]/40 rounded-lg p-4">
          <p className="text-[#f4f4f7] font-medium mb-2">
            <i className="fas fa-key mr-2 text-[#3b82f6]"></i>
            Copy your new API key now — it won't be shown again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 break-all px-3 py-2 bg-[#0e0e13] border border-[#20202a] rounded-xl text-[#f4f4f7]">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="px-3 py-2 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 space-y-4"
        >
          <input
            required
            type="text"
            placeholder="Key name (e.g. CI pipeline)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
          >
            Generate Key
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-[#9a9aa5]">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-[#9a9aa5]">No API keys yet. Generate one to connect your Playwright runs.</p>
      ) : (
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0e0e13]/50 border-b border-[#20202a]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Last used</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#f4f4f7]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const createdRaw = k.created_at || k.createdAt;
                const lastUsedRaw = k.last_used || k.lastUsed;
                const prefix = k.key_prefix || k.keyPrefix || 'pd_sk_';

                const createdFormatted =
                  createdRaw && !isNaN(new Date(createdRaw).getTime())
                    ? new Date(createdRaw).toLocaleString()
                    : 'Recently';

                const lastUsedFormatted =
                  lastUsedRaw && !isNaN(new Date(lastUsedRaw).getTime())
                    ? new Date(lastUsedRaw).toLocaleString()
                    : 'Never';

                return (
                  <tr key={k.id} className="border-t border-[#20202a]">
                    <td className="px-4 py-3 font-medium text-[#f4f4f7]">{k.name}</td>
                    <td className="px-4 py-3 text-[#9a9aa5]">
                      <code className="font-mono text-xs text-[#60a5fa]">{prefix}…</code>
                    </td>
                    <td className="px-4 py-3 text-[#9a9aa5]">
                      {createdFormatted}
                    </td>
                    <td className="px-4 py-3 text-[#9a9aa5]">
                      <span className={lastUsedRaw ? 'text-emerald-400 font-medium' : 'text-[#5e5e68]'}>
                        {lastUsedFormatted}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revoke(k)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApiKeys;
