import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { ByosConfig, StorageByosProvider } from '../../types/api';

export interface ByosConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  byosEnabled: boolean;
  config: ByosConfig;
  onSave: (data: { byosEnabled: boolean; config: ByosConfig }) => void;
}

export const ByosConfigModal: React.FC<ByosConfigModalProps> = ({
  isOpen,
  onClose,
  byosEnabled: initialEnabled,
  config: initialConfig,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [provider, setProvider] = useState<StorageByosProvider>(
    initialConfig.provider || 's3'
  );
  const [bucket, setBucket] = useState(initialConfig.bucket || '');
  const [region, setRegion] = useState(initialConfig.region || 'us-east-1');
  const [endpoint, setEndpoint] = useState(initialConfig.endpoint || '');
  const [accessKey, setAccessKey] = useState(
    initialConfig.access_key || initialConfig.accessKey || ''
  );
  const [secretKey, setSecretKey] = useState(
    initialConfig.secret_key || initialConfig.secretKey || ''
  );

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setEnabled(initialEnabled);
    setProvider(initialConfig.provider || 's3');
    setBucket(initialConfig.bucket || '');
    setRegion(initialConfig.region || 'us-east-1');
    setEndpoint(initialConfig.endpoint || '');
    setAccessKey(initialConfig.access_key || initialConfig.accessKey || '');
    setSecretKey(initialConfig.secret_key || initialConfig.secretKey || '');
    setTestResult(null);
  }, [initialEnabled, initialConfig, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiService.testByosConnection({
        provider,
        bucket: bucket.trim(),
        region: region.trim(),
        endpoint: endpoint.trim() || undefined,
        access_key: accessKey.trim(),
        secret_key: secretKey.trim(),
      });
      setTestResult({
        success: true,
        message: res.data?.message || 'Successfully connected to storage bucket!',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.error || err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      byosEnabled: enabled,
      config: {
        provider,
        bucket: bucket.trim(),
        region: region.trim(),
        endpoint: endpoint.trim() || undefined,
        access_key: accessKey.trim(),
        secret_key: secretKey.trim(),
      },
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#15151c] border border-[#2b2b3b] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scaleUp max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a24] border-b border-[#2b2b3b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <i className="fas fa-server text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <span>Bring Your Own Storage (BYOS)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#282838] text-teal-400 border border-teal-500/20">
                  Enterprise
                </span>
              </h2>
              <p className="text-xs text-[#9a9aa5]">
                Store test artifacts directly in your own cloud infrastructure
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

        {/* Form Body */}
        <form id="byos-form" onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Enable Switch */}
          <div className="p-4 bg-[#0e0e13] border border-[#252533] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#f4f4f7] block">
                Enable Bring Your Own Storage
              </span>
              <p className="text-[11px] text-[#9a9aa5] mt-0.5">
                Direct all future test screenshots, traces, and videos to your private bucket.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#252533] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          {/* Storage Provider */}
          <div>
            <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
              Storage Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as StorageByosProvider)}
              className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500"
            >
              <option value="s3">Amazon Web Services (AWS S3)</option>
              <option value="r2">Cloudflare R2 (S3 API Compatible)</option>
              <option value="minio">MinIO Object Storage</option>
              <option value="gcs">Google Cloud Storage (GCS)</option>
              <option value="azure">Microsoft Azure Blob Storage</option>
            </select>
          </div>

          {/* Bucket Name & Region */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                Bucket Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="e.g. acme-playwright-artifacts"
                className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                Region <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. us-east-1, eu-central-1"
                className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Custom Endpoint (Optional) */}
          {(provider === 'minio' || provider === 'r2') && (
            <div>
              <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                S3 Custom Endpoint URL
              </label>
              <input
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://minio.internal.company.com or https://<id>.r2.cloudflarestorage.com"
                className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          )}

          {/* Credentials */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                Access Key ID / Client ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required={enabled}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f4f4f7] mb-1.5">
                Secret Access Key <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                required={enabled && !secretKey}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="w-full px-3 py-2 bg-[#0e0e13] border border-[#262635] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <i
                className={`fas ${
                  testResult.success ? 'fa-check' : 'fa-triangle-exclamation'
                } text-sm mt-0.5`}
              ></i>
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1a1a24] border-t border-[#2b2b3b] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !bucket}
            className="px-4 py-2 bg-[#252535] hover:bg-[#303045] text-xs font-semibold text-[#f4f4f7] rounded-xl transition-colors border border-[#37374d] flex items-center gap-1.5 disabled:opacity-50"
          >
            <i
              className={`fas fa-vial text-xs ${
                testing ? 'fa-spin text-teal-400' : ''
              }`}
            ></i>
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#9a9aa5] hover:text-[#f4f4f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="byos-form"
              className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center gap-2"
            >
              <i className="fas fa-check text-xs"></i>
              <span>Save Storage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ByosConfigModal;
