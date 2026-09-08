/**
 * Interactive Legal & Data Protection Portal
 * Supports tabs: privacy, terms, acceptable-use, dpa, cookie-policy, security
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export type LegalTab = 'privacy' | 'terms' | 'acceptable-use' | 'dpa' | 'cookie-policy' | 'security';

interface LegalProps {
  initialTab?: LegalTab;
}

const Legal: React.FC<LegalProps> = ({ initialTab = 'privacy' }) => {
  const location = useLocation();

  // Determine active tab based on path or initial prop
  const getTabFromPath = (): LegalTab => {
    const path = location.pathname.toLowerCase();
    if (path.includes('terms')) return 'terms';
    if (path.includes('acceptable-use') || path.includes('aup')) return 'acceptable-use';
    if (path.includes('dpa')) return 'dpa';
    if (path.includes('cookie')) return 'cookie-policy';
    if (path.includes('security')) return 'security';
    if (path.includes('privacy')) return 'privacy';
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<LegalTab>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f7] p-6 lg:p-10 selection:bg-blue-600 selection:text-white">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#20202a] pb-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-shield-halved text-sm"></i>
            </span>
            <span className="text-xl font-extrabold tracking-tight">Legal &amp; Trust Center</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
              Updated Sept 2026
            </span>
          </div>
          <p className="text-xs text-[#9a9aa5]">
            Official privacy, terms, acceptable use, data protection addendum, and enterprise security policies.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#f4f4f7] text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <i className="fas fa-chart-line text-[#3b82f6]"></i> Go to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#14141b] border border-[#20202a] hover:bg-[#1a1a24] text-xs font-semibold rounded-xl transition text-[#9a9aa5] hover:text-white inline-flex items-center gap-1.5"
          >
            <i className="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider px-3 mb-2">
            Policy Documents
          </div>
          
          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-shield-halved text-sm"></i>
              Privacy Policy
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">GDPR</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'terms'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-scale-balanced text-sm"></i>
              Terms of Use
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">SLA</span>
          </button>

          <button
            onClick={() => setActiveTab('acceptable-use')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'acceptable-use'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-hand-holding-hand text-sm"></i>
              Acceptable Use
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">AUP</span>
          </button>

          <button
            onClick={() => setActiveTab('dpa')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'dpa'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-file-contract text-sm"></i>
              Data Processing (DPA)
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">Art. 28</span>
          </button>

          <button
            onClick={() => setActiveTab('cookie-policy')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'cookie-policy'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-cookie-bite text-sm"></i>
              Cookie Policy
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">Cookies</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-[#3b82f6] border border-[#3b82f6]/40 shadow-sm'
                : 'bg-[#14141b] border border-[#20202a] text-[#9a9aa5] hover:text-white hover:border-[#3b82f6]/30'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-shield-virus text-sm"></i>
              Security &amp; Architecture
            </span>
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">SOC2</span>
          </button>

          {/* Standalone Links Box */}
          <div className="p-4 bg-[#14141b] rounded-xl border border-[#20202a] text-xs text-[#9a9aa5] mt-6 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <i className="fas fa-external-link-alt text-[#3b82f6]"></i> Standalone Pages
            </div>
            <p>Access independent static HTML pages:</p>
            <ul className="space-y-1 text-blue-400">
              <li><a href="/privacy.html" target="_blank" rel="noreferrer" className="hover:underline">privacy.html &rarr;</a></li>
              <li><a href="/terms.html" target="_blank" rel="noreferrer" className="hover:underline">terms.html &rarr;</a></li>
              <li><a href="/acceptable-use.html" target="_blank" rel="noreferrer" className="hover:underline">acceptable-use.html &rarr;</a></li>
              <li><a href="/dpa.html" target="_blank" rel="noreferrer" className="hover:underline">dpa.html &rarr;</a></li>
              <li><a href="/cookie-policy.html" target="_blank" rel="noreferrer" className="hover:underline">cookie-policy.html &rarr;</a></li>
              <li><a href="/security.html" target="_blank" rel="noreferrer" className="hover:underline">security.html &rarr;</a></li>
            </ul>
          </div>
        </div>

        {/* Policy Content Viewer */}
        <div className="lg:col-span-3 bg-[#0e0e13] border border-[#20202a] rounded-2xl p-6 sm:p-10 space-y-8">
          
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-shield-halved text-blue-500"></i>
                  Privacy Policy
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">Effective Date: September 1, 2026 &bull; Version 3.2</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                <strong>Executive Summary:</strong> We protect all test suite traces, logs, failure snapshots, and developer credentials. We do not sell user data to advertising brokers.
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Data Controller vs. Processor Status</h3>
                <p>
                  Under GDPR and CCPA, Playwright Dashboard operates as a <strong>Data Controller</strong> for account credentials and billing records, and as a <strong>Data Processor</strong> for all automated test runs, trace files, DOM snapshots, and console logs ingested into our API.
                </p>

                <h3 className="text-base font-semibold text-white">2. Ingested Test Telemetry</h3>
                <p>
                  When your Playwright test runner connects to <code>/api/tests/ingest</code>, we receive test suite titles, pass/fail status, durations, flaky patterns, screenshots, and trace zips. We strongly recommend stripping production credentials and personal health/payment data from automated test fixtures before uploading.
                </p>

                <h3 className="text-base font-semibold text-white">3. Retention &amp; Automated Pruning</h3>
                <p>
                  Heavy artifacts (traces and video captures) are automatically purged after 14 to 30 days based on workspace settings, minimizing retention exposure while maintaining longitudinal flaky test analytics.
                </p>

                <h3 className="text-base font-semibold text-white">4. Your Statutory Rights</h3>
                <p>
                  You may request export, rectification, or complete deletion of your account and test metadata at any time by contacting{' '}
                  <a href="mailto:privacy@playwright-dashboard.easytesting.app" className="text-blue-400 underline">privacy@playwright-dashboard.easytesting.app</a>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-scale-balanced text-indigo-400"></i>
                  Terms of Use
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">Effective Date: September 1, 2026 &bull; Master Services Agreement</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                <strong>Customer Ownership:</strong> You retain 100% intellectual property ownership over your test code, logs, and artifacts.
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Service Scope &amp; Availability</h3>
                <p>
                  Playwright Dashboard provides real-time test run reporting and flakiness detection with a 99.9% monthly availability target for cloud ingest endpoints, excluding scheduled maintenance.
                </p>

                <h3 className="text-base font-semibold text-white">2. API Key Confidentiality</h3>
                <p>
                  Project ingestion tokens must be kept secret. Customers are responsible for rotating compromised tokens immediately using Workspace Settings.
                </p>

                <h3 className="text-base font-semibold text-white">3. Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by applicable law, neither party shall be liable for indirect or consequential damages. Total aggregate liability is limited to fees paid in the preceding 12 months.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'acceptable-use' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-hand-holding-hand text-amber-400"></i>
                  Acceptable Use Policy (AUP)
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">Resource quotas, fair use, and safety guidelines</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Prohibited Actions</h3>
                <p>
                  Users may not launch denial-of-service attacks, conduct unauthorized penetration tests, engage in crypto-mining, or inject malware into uploaded Playwright trace bundles.
                </p>

                <h3 className="text-base font-semibold text-white">2. Ingestion Boundaries</h3>
                <p>
                  Standard accounts receive 120 requests/minute ingest quota and a 50MB per-artifact maximum file size cap. Abusive bursts receive HTTP 429 rate limit responses.
                </p>

                <h3 className="text-base font-semibold text-white">3. Violations &amp; Reporting</h3>
                <p>
                  Reports of abusive behavior should be directed to{' '}
                  <a href="mailto:abuse@playwright-dashboard.easytesting.app" className="text-blue-400 underline">abuse@playwright-dashboard.easytesting.app</a>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dpa' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-file-contract text-purple-400"></i>
                  Data Processing Addendum (DPA)
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">GDPR Article 28 &bull; EU Standard Contractual Clauses (SCCs)</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Processor Commitments</h3>
                <p>
                  Processor processes Customer Personal Data solely on documented instructions from Customer and binds all authorized personnel to strict non-disclosure obligations.
                </p>

                <h3 className="text-base font-semibold text-white">2. Incident Notification (72 Hours)</h3>
                <p>
                  Processor commits to notifying Customer without undue delay and in any event within 72 hours of confirming any Personal Data Breach.
                </p>

                <h3 className="text-base font-semibold text-white">3. Cross-Border Data Transfers</h3>
                <p>
                  International data transfers out of the EEA and UK are covered under European Commission Standard Contractual Clauses (Module 2, Controller-to-Processor).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookie-policy' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-cookie-bite text-cyan-400"></i>
                  Cookie &amp; Local Storage Policy
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">Client-side persistence inventory and privacy guarantees</p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
                <strong>Zero Third-Party Advertising Trackers:</strong> We do not load ad pixels or sell browsing telemetry.
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Key Storage Inventory</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>token</code> (Cookie/LocalStorage): Session authentication JWT.</li>
                  <li><code>theme</code> (LocalStorage): UI dark/light mode preference.</li>
                  <li><code>sidebar_collapsed</code> (LocalStorage): Navigation layout state.</li>
                  <li><code>active_project_id</code> (SessionStorage): Active test project filter.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-[#20202a] pb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <i className="fas fa-shield-virus text-emerald-400"></i>
                  Security, Architecture &amp; Responsible Disclosure
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">SOC 2 Aligned &bull; Defense-in-Depth Cryptographic Architecture</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Cryptographic Standards</h3>
                <p>
                  Enforced TLS 1.3 in transit with HSTS preload. AES-256 encryption at rest across all database disks and artifact object buckets.
                </p>

                <h3 className="text-base font-semibold text-white">2. Multi-Tenant Row Isolation</h3>
                <p>
                  Database row-level security (RLS) policies enforce cryptographic multi-tenant isolation, ensuring organization workspaces cannot access cross-tenant data.
                </p>

                <h3 className="text-base font-semibold text-white">3. Vulnerability Disclosure &amp; Safe Harbor</h3>
                <p>
                  Researchers reporting in good faith to{' '}
                  <a href="mailto:security@playwright-dashboard.easytesting.app" className="text-blue-400 underline">security@playwright-dashboard.easytesting.app</a>{' '}
                  are covered by our Safe Harbor commitment.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Legal;
