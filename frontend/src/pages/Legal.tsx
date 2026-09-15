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
            Official privacy, terms, acceptable use, data protection addendum, and enterprise security policies adhering to GDPR, CCPA, and Nigeria Data Protection Act (NDPA 2023) regulations.
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
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">GDPR &bull; NDPA</span>
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
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">GDPR &bull; NDPA</span>
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
            <span className="text-[10px] bg-[#0e0e13] px-1.5 py-0.5 rounded text-[#9a9aa5]">SOC2 &bull; NDPA</span>
          </button>

          {/* Standalone Links Box */}
          <div className="p-4 bg-[#14141b] rounded-xl border border-[#20202a] text-xs text-[#9a9aa5] mt-6 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <i className="fas fa-external-link-alt text-[#3b82f6]"></i> Standalone Pages
            </div>
            <p>Access independent static HTML pages with full regulatory disclosures:</p>
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
                <p className="text-xs text-[#9a9aa5] mt-1">Effective Date: September 1, 2026 &bull; Version 3.3 (GDPR, CCPA &amp; NDPA Compliant)</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                <strong>Executive Summary:</strong> We protect all test suite traces, logs, failure snapshots, and developer credentials under the EU/UK GDPR, California CCPA/CPRA, and Nigeria Data Protection Act 2023 (NDPA). We do not sell user data to advertising brokers.
              </div>

              <div className="space-y-5 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">1. Data Controller vs. Processor Designation</h3>
                  <p>
                    In full adherence with EU/UK GDPR, California CCPA/CPRA, and the <strong>Nigeria Data Protection Act, 2023 (NDPA Section 65 / Part V)</strong>, Playwright Dashboard operates in dual distinct capacities:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Data Controller:</strong> For account registration credentials, billing records, customer support correspondence, and platform telemetry. Under NDPA Section 65, we act as a Data Controller for our registered user community.</li>
                    <li><strong>Data Processor:</strong> For automated test execution artifacts, DOM snapshots, network payloads, console logs, and failure recordings transmitted from your CI/CD pipelines to <code>/api/tests/ingest</code>. Your organization remains the Data Controller, and we act as a Data Processor pursuant to GDPR Article 28 and NDPA Section 29.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">2. Lawful Bases for Processing (GDPR &amp; NDPA Sec. 25)</h3>
                  <p>We process personal data solely where a valid legal basis exists under GDPR Article 6 and NDPA Section 25:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Performance of a Contract (GDPR Art. 6(1)(b) &amp; NDPA Sec. 25(1)(b)):</strong> To provide the dashboard services, authenticate test runners, ingest build telemetry, and provide flaky test reporting.</li>
                    <li><strong>Legitimate Interests (GDPR Art. 6(1)(f) &amp; NDPA Sec. 25(1)(e)):</strong> To safeguard infrastructure against cyber threats, monitor service reliability, and aggregate anonymized test failure benchmarks.</li>
                    <li><strong>Consent (GDPR Art. 6(1)(a) &amp; NDPA Sec. 25(1)(a)):</strong> For optional communication preferences, beta programs, or marketing digests (revocable anytime).</li>
                    <li><strong>Compliance with Legal Obligations (GDPR Art. 6(1)(c) &amp; NDPA Sec. 25(1)(c)):</strong> To satisfy statutory, accounting, or regulatory requirements.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">3. Telemetry Ingestion &amp; Security Safeguards (NDPA Sec. 39)</h3>
                  <p>
                    When your Playwright runner transmits results to our API, we ingest test suite names, pass/fail statuses, run durations, failure traces, and trace zip bundles. We mandate technical safeguards required under GDPR Article 32 and <strong>NDPA Section 39</strong>:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Enforced TLS 1.3 encryption in transit with HSTS preload headers.</li>
                    <li>AES-256 cryptographic disk encryption for database rows and artifact object storage.</li>
                    <li>Multi-tenant Row-Level Security (RLS) ensuring strict cryptographic organization boundary isolation.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">4. Retention &amp; Automated Pruning</h3>
                  <p>
                    Heavy execution artifacts (traces and video captures) are automatically pruned after 14 to 30 days based on workspace policy, minimizing storage exposure while retaining longitudinal regression metrics.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">5. Cross-Border Data Transfers (NDPA Part VIII, Sec. 41–43)</h3>
                  <p>
                    Where test metadata or personal data of Nigerian or EEA/UK data subjects is processed across international cloud infrastructure, all transfers are conducted under approved cross-border transfer mechanisms, including European Commission Standard Contractual Clauses (SCCs), NDPA adequacy criteria recognized by the Nigeria Data Protection Commission (NDPC), or contractual necessity for the fulfillment of our services.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">6. Statutory Data Subject Rights (GDPR, CCPA &amp; NDPA Part VI)</h3>
                  <p>You have full enforceable rights under NDPA Sections 34–38, GDPR Chapter III, and CCPA:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Right to be Informed:</strong> Transparent disclosure of all collection and processing operations (NDPA Sec. 34; GDPR Art. 13/14).</li>
                    <li><strong>Right of Access &amp; Portability:</strong> Obtain an exportable copy (JSON/CSV) of your personal account data (NDPA Sec. 34(1)(a) &amp; 38; GDPR Art. 15/20).</li>
                    <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete credentials via Workspace Settings (NDPA Sec. 34(1)(b); GDPR Art. 16).</li>
                    <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request permanent deletion of accounts, test records, and traces (NDPA Sec. 34(1)(c); GDPR Art. 17).</li>
                    <li><strong>Right to Restrict or Object:</strong> Restrict or object to processing based on legitimate interests (NDPA Sec. 34(1)(d) &amp; 36; GDPR Art. 18/21).</li>
                    <li><strong>Automated Decision Protections:</strong> Immunity from adverse decisions based purely on automated profiling (NDPA Sec. 37; GDPR Art. 22).</li>
                    <li><strong>Non-Discrimination:</strong> Exercising your rights will never result in service degradation or pricing discrimination.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#14141b] border border-[#20202a] space-y-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <i className="fas fa-landmark-flag text-blue-400"></i>
                    7. Specific Disclosures for Nigerian Data Subjects (NDPA 2023)
                  </h3>
                  <p className="text-xs text-[#9a9aa5]">
                    In compliance with the <strong>Nigeria Data Protection Act, 2023</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#9a9aa5]">
                    <li><strong>72-Hour Breach Notification:</strong> Under NDPA Section 40, we immediately notify customer Data Controllers upon confirming any personal data breach to enable Controller reporting to the NDPC within 72 hours.</li>
                    <li><strong>Child Protection (Section 31):</strong> We do not knowingly collect personal data from individuals under 18 years of age.</li>
                    <li><strong>Lodge a Complaint with NDPC:</strong> You hold the legal right to submit complaints directly to the Nigeria Data Protection Commission (NDPC):
                      <div className="mt-1 pl-2 border-l border-[#3b82f6]/40 text-muted">
                        Website: <a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">ndpc.gov.ng</a> &bull; Email: <a href="mailto:info@ndpc.gov.ng" className="text-blue-400 hover:underline">info@ndpc.gov.ng</a>
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">8. Privacy Contacts &amp; Data Protection Officer</h3>
                  <p>
                    To exercise statutory rights or escalate privacy matters, contact our data protection team:
                  </p>
                  <div className="mt-2 p-3 bg-[#14141b] rounded-xl border border-[#20202a] space-y-1 text-xs text-[#9a9aa5]">
                    <p>Data Protection Officer: <a href="mailto:dpo@easytesting.app" className="text-blue-400 underline">dpo@easytesting.app</a></p>
                    <p>Privacy Inquiries: <a href="mailto:privacy@easytesting.app" className="text-blue-400 underline">privacy@easytesting.app</a></p>
                    <p>Security Operations: <a href="mailto:security@easytesting.app" className="text-blue-400 underline">security@easytesting.app</a></p>
                    <p>Legal &amp; Compliance: <a href="mailto:legal@easytesting.app" className="text-blue-400 underline">legal@easytesting.app</a></p>
                  </div>
                </div>
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
                  Project ingestion tokens must be kept secret. Customers are responsible for rotating compromised tokens immediately using Workspace Settings. Notify <a href="mailto:security@easytesting.app" className="text-blue-400 underline">security@easytesting.app</a> upon discovering token leakage.
                </p>

                <h3 className="text-base font-semibold text-white">3. Limitation of Liability &amp; Regulatory Carve-Out</h3>
                <p>
                  To the maximum extent permitted by applicable law, neither party shall be liable for indirect or consequential damages. Total aggregate liability is limited to fees paid in the preceding 12 months. Nothing in these Terms limits statutory rights under mandatory data protection legislation, including the EU GDPR and Nigeria Data Protection Act 2023 (NDPA).
                </p>

                <h3 className="text-base font-semibold text-white">4. Legal Contact</h3>
                <p>
                  Contractual inquiries should be sent to{' '}
                  <a href="mailto:legal@easytesting.app" className="text-blue-400 underline">legal@easytesting.app</a>.
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
                  <a href="mailto:abuse@easytesting.app" className="text-blue-400 underline">abuse@easytesting.app</a>.
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
                <p className="text-xs text-[#9a9aa5] mt-1">GDPR Article 28 &bull; NDPA 2023 Section 29 &bull; EU Standard Contractual Clauses (SCCs)</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                <strong>Controller-to-Processor Agreement:</strong> Applies where Customer Data contains personal data subject to GDPR, UK Data Protection Act, or the Nigeria Data Protection Act 2023 (NDPA).
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Processor Commitments (GDPR Art. 28 &amp; NDPA Sec. 29)</h3>
                <p>
                  Processor processes Customer Personal Data solely on documented instructions from Customer, binds authorized personnel to strict confidentiality, and provides reasonable assistance to enable Customer to respond to Data Subject requests under GDPR Chapter III and NDPA Part VI.
                </p>

                <h3 className="text-base font-semibold text-white">2. Incident Notification (72 Hours - NDPA Sec. 40 &amp; GDPR Art. 33)</h3>
                <p>
                  Processor commits to notifying Customer without undue delay and in any event within 72 hours of confirming any Personal Data Breach. For NDPA-governed customers, Processor shall provide immediate notice to enable Controller notification to the Nigeria Data Protection Commission (NDPC).
                </p>

                <h3 className="text-base font-semibold text-white">3. Cross-Border Data Transfers (NDPA Part VIII &amp; EU SCCs)</h3>
                <p>
                  International data transfers out of the EEA, UK, Switzerland, or Nigeria are governed by Module 2 (Controller-to-Processor) Standard Contractual Clauses and lawful transfer criteria authorized under NDPA Part VIII (Sections 41–43).
                </p>

                <h3 className="text-base font-semibold text-white">4. Technical &amp; Organizational Measures (NDPA Sec. 39)</h3>
                <p>
                  Processor maintains robust safeguards including TLS 1.3 in transit, AES-256 encryption at rest, role-based access controls, automated vulnerability scans, and audit transparency in compliance with GDPR Article 28 and NDPA Section 39. Contact <a href="mailto:legal@easytesting.app" className="text-blue-400 underline">legal@easytesting.app</a> for countersigned enterprise DPAs.
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

                <h3 className="text-base font-semibold text-white">2. Cookie Inquiries</h3>
                <p>
                  Questions regarding our cookie or storage mechanisms can be emailed to <a href="mailto:privacy@easytesting.app" className="text-blue-400 underline">privacy@easytesting.app</a>.
                </p>
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
                <p className="text-xs text-[#9a9aa5] mt-1">SOC 2 Aligned &bull; NDPA Sec 39 &bull; Defense-in-Depth Cryptographic Architecture</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#9a9aa5] leading-relaxed">
                <h3 className="text-base font-semibold text-white">1. Cryptographic Standards &amp; NDPA Section 39 Safeguards</h3>
                <p>
                  Enforced TLS 1.3 in transit with HSTS preload. AES-256 encryption at rest across all database disks and artifact object buckets. Our security controls align with SOC 2 Type II trust criteria, ISO/IEC 27001 principles, GDPR Article 32, and NDPA 2023 Section 39 (Security of Processing).
                </p>

                <h3 className="text-base font-semibold text-white">2. Multi-Tenant Row Isolation</h3>
                <p>
                  Database row-level security (RLS) policies enforce cryptographic multi-tenant isolation, ensuring organization workspaces cannot access cross-tenant data.
                </p>

                <h3 className="text-base font-semibold text-white">3. Vulnerability Disclosure &amp; Safe Harbor</h3>
                <p>
                  Researchers reporting in good faith to{' '}
                  <a href="mailto:security@easytesting.app" className="text-blue-400 underline">security@easytesting.app</a>{' '}
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
