import React from 'react';
import StorageRetentionTable from '../components/Storage/StorageRetentionTable';

export const StorageSettings: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Breadcrumbs */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <i className="fas fa-database text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] flex items-center gap-3">
                <span>Storage & Data Retention</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Custom Policies
                </span>
              </h1>
              <p className="text-sm text-[#9a9aa5] mt-1">
                Configure data retention timeframes for test artifacts, results, and cloud storage options.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Storage Retention Table */}
      <StorageRetentionTable />

      {/* Best Practices & Retention Lifecycle Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-[#15151c] border border-[#20202a] rounded-xl p-5 shadow-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <i className="fas fa-check-circle"></i>
          </div>
          <h3 className="font-bold text-[#f4f4f7]">Passed Test Artifacts</h3>
          <p className="text-[#9a9aa5] leading-relaxed">
            Successful tests rarely require prolonged trace and video preservation. Standard retention is 7 days, reducing storage footprint by up to 80%.
          </p>
        </div>

        <div className="bg-[#15151c] border border-[#20202a] rounded-xl p-5 shadow-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <i className="fas fa-bug"></i>
          </div>
          <h3 className="font-bold text-[#f4f4f7]">Failed & Flaky Tests</h3>
          <p className="text-[#9a9aa5] leading-relaxed">
            Preserved longer (21+ days) to facilitate deep root cause analysis, regression tracking, and visual snapshot debugging across sprint cycles.
          </p>
        </div>

        <div className="bg-[#15151c] border border-[#20202a] rounded-xl p-5 shadow-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            <i className="fas fa-cloud-arrow-up"></i>
          </div>
          <h3 className="font-bold text-[#f4f4f7]">Bring Your Own Storage</h3>
          <p className="text-[#9a9aa5] leading-relaxed">
            Connect private AWS S3, Cloudflare R2, or MinIO buckets to retain infinite artifacts within your own enterprise compliance perimeter.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorageSettings;
