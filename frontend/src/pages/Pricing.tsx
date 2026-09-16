/**
 * Interactive In-App Pricing & Plan Overview Page
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isAnnual = billingCycle === 'annual';

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'What counts as a "recorded test execution"?',
      a: 'A recorded test is a single test block (test(\'name\', ...)) processed by our reporter in your CI/CD pipeline. If a test suite runs 50 tests, that uses 50 test credits. Retries count toward the total if uploaded. Running tests locally without the dashboard reporter never consumes quota.',
    },
    {
      q: 'How do the team member / seat limits work?',
      a: 'The Community tier is strictly for solo engineers (1 user, no collaborator invites). The Team tier supports up to 3 team members, ideal for developer pairs and micro-squads. The Business and Enterprise tiers include unlimited team seats so your entire engineering department can triage traces without extra per-seat fees.',
    },
    {
      q: 'What happens if we exceed our monthly test limit?',
      a: 'We never fail or stop your CI builds. When a Free workspace reaches 3,000 tests, we continue capturing pass/fail health metrics but temporarily pause heavy trace and video uploads until the next cycle or upgrade. Paid plans can enable automatic overages ($3–$4 per 2,500 tests) to ensure uninterrupted artifact capture.',
    },
    {
      q: 'Can we still self-host Playwright Dashboard for free?',
      a: 'Yes! Our Community edition is 100% free and open-source, runnable via Docker and Docker Compose. Self-hosting keeps all test artifacts, traces, and database records entirely within your private network perimeter.',
    },
    {
      q: 'Do you offer SOC 2 compliance packages and signed DPAs?',
      a: 'Yes. All cloud plans strictly adhere to EU/UK GDPR, California CCPA, and the Nigeria Data Protection Act (NDPA 2023). For organizations requiring custom countersigned Data Processing Addendums (DPAs), vendor security assessments, and SOC 2 Type II audit packages, these are included in our Enterprise tier.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f7] selection:bg-blue-600 selection:text-white pb-24">
      {/* Top Banner */}
      <div className="border-b border-[#20202a] bg-[#0a0a0e]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/landing.html" className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
                <i className="fas fa-chart-line text-sm"></i>
              </span>
              <span className="font-bold text-base tracking-tight text-white">Playwright Dashboard</span>
            </Link>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
              Pricing
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#f4f4f7] text-xs font-semibold rounded-xl transition inline-flex items-center gap-2"
            >
              <i className="fas fa-chart-line text-[#3b82f6]"></i> Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
            <i className="fas fa-tag"></i> Transparent Developer-Centric Pricing
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Simple Pricing for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Modern Test Automation
            </span>
          </h1>
          <p className="text-[#9a9aa5] text-xs sm:text-sm mt-3 max-w-xl mx-auto">
            Choose a plan tailored to your team scale. Solo free tier forever, collaborative team tiers, and custom enterprise compliance.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 bg-[#14141b] border border-[#20202a] rounded-2xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                !isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-[#9a9aa5] hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-[#9a9aa5] hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          
          {/* Card 1: Community */}
          <div className="bg-[#0e0e13]/80 border border-[#20202a] hover:border-blue-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
                  Community
                </span>
                <span className="text-xs text-[#5e5e68]">Solo Dev</span>
              </div>
              <h2 className="text-xl font-bold text-white">Free Forever</h2>
              <p className="text-xs text-[#9a9aa5] mt-1">For solo engineers, open-source repos, and hobby pipelines.</p>

              <div className="my-6">
                <div className="text-3xl font-extrabold text-white">$0</div>
                <div className="text-xs text-[#5e5e68] mt-0.5">Free forever &bull; No card required</div>
              </div>

              <div className="p-3 bg-[#14141b] rounded-xl border border-[#20202a] mb-6 text-xs text-zinc-300 flex items-center gap-2">
                <i className="fas fa-user text-blue-400"></i>
                <span><strong>1 User (Solo Developer)</strong> &bull; No invites</span>
              </div>

              <ul className="space-y-3 text-xs text-[#9a9aa5]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>3,000</strong> recorded tests / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>14 days</strong> trace &amp; video retention</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Up to <strong>3 active projects</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Live WebSocket execution stream</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Full Playwright Trace Viewer</span>
                </li>
                <li className="flex items-start gap-2 text-[#5e5e68]">
                  <i className="fas fa-times mt-0.5"></i>
                  <span>Build comparison engine</span>
                </li>
                <li className="flex items-start gap-2 text-[#5e5e68]">
                  <i className="fas fa-times mt-0.5"></i>
                  <span>Flaky test auto-quarantine</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#20202a]">
              <Link
                to="/signup?plan=community"
                className="block text-center w-full py-2.5 px-4 bg-[#14141b] hover:bg-[#1a1a24] border border-[#20202a] text-white font-semibold text-xs rounded-xl transition"
              >
                Start Free Solo
              </Link>
            </div>
          </div>

          {/* Card 2: Team */}
          <div className="bg-[#0e0e13]/80 border border-[#20202a] hover:border-blue-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Team
                </span>
                <span className="text-xs text-[#5e5e68]">Micro-Squads</span>
              </div>
              <h2 className="text-xl font-bold text-white">Team</h2>
              <p className="text-xs text-[#9a9aa5] mt-1">For agile dev pairs and small QA squads running frequent CI.</p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isAnnual ? '$39' : '$49'}
                  </span>
                  <span className="text-xs text-[#9a9aa5]">/ month</span>
                </div>
                <div className="text-xs text-[#5e5e68] mt-0.5">
                  {isAnnual ? 'Billed annually ($468/yr)' : 'Billed monthly'}
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-6 text-xs text-blue-200 flex items-center gap-2">
                <i className="fas fa-users text-blue-400"></i>
                <span><strong>Up to 3 Team Members</strong> &bull; Collab ready</span>
              </div>

              <ul className="space-y-3 text-xs text-[#9a9aa5]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>25,000</strong> recorded tests / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>45 days</strong> trace &amp; video retention</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Unlimited</strong> active projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Build Compare Engine:</strong> Diff runs</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Slack, Discord &amp; Teams alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>GitHub &amp; GitLab PR decorations</span>
                </li>
                <li className="flex items-start gap-2 text-[#5e5e68]">
                  <i className="fas fa-times mt-0.5"></i>
                  <span>Flaky test auto-quarantine</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#20202a]">
              <Link
                to="/signup?plan=team"
                className="block text-center w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-600/20"
              >
                Start 14-Day Team Trial
              </Link>
            </div>
          </div>

          {/* Card 3: Business (Featured) */}
          <div className="bg-gradient-to-b from-[#141824] to-[#0e0e13] border border-blue-500/50 rounded-2xl p-6 flex flex-col justify-between relative shadow-xl shadow-blue-600/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Business
                </span>
                <span className="text-xs text-blue-400 font-semibold">Scaling Departments</span>
              </div>
              <h2 className="text-xl font-bold text-white">Business</h2>
              <p className="text-xs text-[#9a9aa5] mt-1">For multi-team departments requiring quarantine &amp; zero seat tax.</p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isAnnual ? '$119' : '$149'}
                  </span>
                  <span className="text-xs text-[#9a9aa5]">/ month</span>
                </div>
                <div className="text-xs text-[#5e5e68] mt-0.5">
                  {isAnnual ? 'Billed annually ($1,428/yr)' : 'Billed monthly'}
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mb-6 text-xs text-indigo-200 flex items-center gap-2">
                <i className="fas fa-infinity text-indigo-400"></i>
                <span><strong>Unlimited Team Seats</strong> &bull; Zero per-seat tax</span>
              </div>

              <ul className="space-y-3 text-xs text-[#9a9aa5]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>100,000</strong> recorded tests / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>90 days</strong> trace &amp; video retention</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Flaky Test Auto-Quarantine:</strong> Stop broken CI</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Jira &amp; Linear 1-Click Sync:</strong> Auto-file bugs</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Advanced flakiness &amp; velocity trends</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Custom conditional webhook alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Priority email &amp; private Slack connect</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#20202a]">
              <Link
                to="/signup?plan=business"
                className="block text-center w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-600/30"
              >
                Start 14-Day Business Trial
              </Link>
            </div>
          </div>

          {/* Card 4: Enterprise */}
          <div className="bg-[#0e0e13]/80 border border-[#20202a] hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Enterprise
                </span>
                <span className="text-xs text-[#5e5e68]">Custom Scale</span>
              </div>
              <h2 className="text-xl font-bold text-white">Enterprise</h2>
              <p className="text-xs text-[#9a9aa5] mt-1">For regulated industries, air-gapped VPCs, and high-volume CI.</p>

              <div className="my-6">
                <div className="text-3xl font-extrabold text-white">Custom</div>
                <div className="text-xs text-[#5e5e68] mt-0.5">Annual contracts &bull; Starts at $499/mo</div>
              </div>

              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-6 text-xs text-purple-200 flex items-center gap-2">
                <i className="fas fa-shield-halved text-purple-400"></i>
                <span><strong>SAML SSO &amp; Signed DPA</strong> &bull; Governance</span>
              </div>

              <ul className="space-y-3 text-xs text-[#9a9aa5]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>500,000+ to millions</strong> of tests / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>180 days to 1 yr+</strong> custom retention</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>SAML 2.0 SSO &amp; SCIM Provisioning</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Immutable Audit Logs</strong> &amp; granular RBAC</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span><strong>Signed Enterprise DPA</strong> (GDPR &amp; NDPA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Air-gapped on-premise Kubernetes option</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check text-emerald-400 mt-0.5"></i>
                  <span>Dedicated Technical AM &amp; 99.99% SLA</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#20202a]">
              <a
                href="mailto:legal@easytesting.app?subject=Enterprise%20Plan%20Inquiry%20-%20Playwright%20Dashboard"
                className="block text-center w-full py-2.5 px-4 bg-[#14141b] hover:bg-[#1a1a24] border border-[#20202a] text-white font-semibold text-xs rounded-xl transition"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>

        </div>

        {/* Feature Comparison Matrix */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white">Full Feature Comparison</h2>
            <p className="text-xs text-[#9a9aa5] mt-1">Detailed feature breakdown by subscription tier.</p>
          </div>

          <div className="overflow-x-auto bg-[#0e0e13] border border-[#20202a] rounded-2xl p-5">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#20202a] text-[#9a9aa5]">
                  <th className="p-3 font-semibold text-white">Feature</th>
                  <th className="p-3 font-semibold text-center text-zinc-300">Community ($0)</th>
                  <th className="p-3 font-semibold text-center text-blue-400">Team ($49/mo)</th>
                  <th className="p-3 font-semibold text-center text-indigo-400">Business ($149/mo)</th>
                  <th className="p-3 font-semibold text-center text-purple-400">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20202a]/60 text-[#9a9aa5]">
                <tr className="bg-[#14141b]/40 font-semibold text-white">
                  <td colSpan={5} className="p-2.5 text-xs text-blue-400">Team &amp; Scale Limits</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Team Members / Seats</td>
                  <td className="p-3 text-center text-zinc-300"><strong>1 User (Solo)</strong></td>
                  <td className="p-3 text-center text-blue-300"><strong>Up to 3 Members</strong></td>
                  <td className="p-3 text-center text-indigo-300"><strong>Unlimited</strong></td>
                  <td className="p-3 text-center text-purple-300"><strong>Unlimited</strong></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Monthly Tests</td>
                  <td className="p-3 text-center">3,000</td>
                  <td className="p-3 text-center">25,000</td>
                  <td className="p-3 text-center">100,000</td>
                  <td className="p-3 text-center">Custom (500k+)</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Trace &amp; Video Retention</td>
                  <td className="p-3 text-center">14 days</td>
                  <td className="p-3 text-center">45 days</td>
                  <td className="p-3 text-center">90 days</td>
                  <td className="p-3 text-center">180d – 1 yr+</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Active Projects</td>
                  <td className="p-3 text-center">3 Projects</td>
                  <td className="p-3 text-center">Unlimited</td>
                  <td className="p-3 text-center">Unlimited</td>
                  <td className="p-3 text-center">Unlimited</td>
                </tr>

                <tr className="bg-[#14141b]/40 font-semibold text-white">
                  <td colSpan={5} className="p-2.5 text-xs text-blue-400">Diagnostics &amp; Intelligence</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Live WebSocket Telemetry</td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Flaky Test Quarantine</td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Build Compare (Diff Runs)</td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Slack, Discord &amp; Teams</td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">Jira &amp; Linear 1-Click Sync</td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-medium">SAML SSO &amp; Signed DPA</td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-[#5e5e68]"><i className="fas fa-times"></i></td>
                  <td className="p-3 text-center text-emerald-400"><i className="fas fa-check"></i></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-[#9a9aa5] mt-1">Common questions about plans, seats, and billing.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#14141b]/60 border border-[#20202a] hover:border-blue-500/30 rounded-xl p-4 sm:p-5 cursor-pointer transition"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between font-semibold text-xs sm:text-sm text-white">
                  <span>{faq.q}</span>
                  <i
                    className={`fas fa-chevron-down text-xs text-[#9a9aa5] transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  ></i>
                </div>
                {openFaq === idx && (
                  <div className="text-xs sm:text-sm text-[#9a9aa5] mt-3 leading-relaxed border-t border-[#20202a] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/30 text-center">
          <h3 className="text-2xl font-bold text-white">Start accelerating your Playwright test runs</h3>
          <p className="text-xs sm:text-sm text-[#9a9aa5] mt-2 max-w-xl mx-auto">
            Get started in under 2 minutes with our official Playwright reporter package.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup?plan=community"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-600/25"
            >
              Start Free Solo Developer
            </Link>
            <Link
              to="/docs"
              className="px-6 py-3 bg-[#14141b] hover:bg-[#1a1a24] border border-[#20202a] text-white font-semibold text-xs rounded-xl transition"
            >
              View Documentation
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pricing;
