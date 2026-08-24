/**
 * Documentation & Setup Guide Page
 * Includes product introduction modeled after fault0.com/docs/platform,
 * quick start setup, reporter reference, CI/CD integration, team management, and API docs.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Docs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'intro' | 'quickstart' | 'github-action' | 'reporter' | 'cicd' | 'team'>('intro');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f7] p-6 lg:p-10">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#20202a] pb-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-book text-sm"></i>
            </span>
            <span className="text-xl font-extrabold tracking-tight">Playwright Dashboard Documentation</span>
          </div>
          <p className="text-xs text-[#9a9aa5]">
            Introduction, platform features, quick setup guide, reporter reference, and team management docs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 text-[#f4f4f7] text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <i className="fas fa-chart-line text-[#3b82f6]"></i> Go to Dashboard
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] text-[#08080a] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider px-3 mb-2">
            Getting Started
          </div>
          <button
            onClick={() => setActiveTab('intro')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'intro'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-[#3b82f6] fa-info-circle text-sm"></i> Introduction
            </span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>

          <button
            onClick={() => setActiveTab('quickstart')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'quickstart'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-bolt text-sm"></i> Quick Start Guide
            </span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>

          <button
            onClick={() => setActiveTab('github-action')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'github-action'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 shadow-sm'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fab fa-github text-sm text-[#93c5fd]"></i> GitHub Action
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </button>

          <div className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider px-3 pt-4 mb-2">
            Platform & Configuration
          </div>
          <button
            onClick={() => setActiveTab('reporter')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'reporter'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-sliders-h text-sm"></i> Reporter Options
            </span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>

          <button
            onClick={() => setActiveTab('cicd')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'cicd'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fab fa-github text-sm"></i> CI/CD Integration
            </span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
              activeTab === 'team'
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="fas fa-users text-sm"></i> Team & Invitations
            </span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>

          <div className="pt-6 px-3">
            <div className="p-4 bg-[#14141b] border border-[#20202a] rounded-xl text-xs space-y-2">
              <p className="font-semibold text-[#f4f4f7]">Need an API Key?</p>
              <p className="text-[#9a9aa5]">Generate a project API Key to start ingesting test results instantly.</p>
              <Link to="/settings/api-keys" className="text-[#3b82f6] hover:underline font-semibold block pt-1">
                Manage API Keys →
              </Link>
            </div>
          </div>
        </div>

        {/* Documentation Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* INTRODUCTION TAB */}
          {activeTab === 'intro' && (
            <div className="space-y-8">
              {/* Introduction Banner */}
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 lg:p-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] rounded-full text-xs font-semibold uppercase">
                  Platform Documentation
                </div>
                <h1 className="text-3xl font-extrabold text-[#f4f4f7] tracking-tight">
                  Introduction
                </h1>
                <p className="text-base text-[#9a9aa5] leading-relaxed">
                  Welcome to <span className="text-[#f4f4f7] font-semibold">Playwright Dashboard</span> — the centralized, real-time reporting platform for your Playwright end-to-end test suites. Track, analyze, and debug test runs across local environments and CI/CD pipelines in one unified view.
                </p>
              </div>

              {/* The Problem Section */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 lg:p-8 space-y-4">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
                  <i className="fas fa-exclamation-triangle text-amber-400"></i> The Problem
                </h2>
                <p className="text-xs text-[#9a9aa5] leading-relaxed">
                  Running Playwright tests across multiple pipelines and team developer machines creates major visibility and debugging challenges:
                </p>
                <ul className="space-y-3 text-xs text-[#9a9aa5]">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                    <span>
                      <strong className="text-[#f4f4f7]">Scattered Results:</strong> Tests run on CI/CD pipelines, developer machines, staging servers, and production environments with execution results fragmented everywhere.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                    <span>
                      <strong className="text-[#f4f4f7]">No Central Monitoring:</strong> No single location to monitor test suite executions in real time, making it hard to track long-term pass rates or catch recurring test failures.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                    <span>
                      <strong className="text-[#f4f4f7]">Painful Debugging:</strong> When tests fail in CI, developers waste valuable engineering time digging through raw terminal logs, downloading heavy artifact zips, and attempting to reproduce failures locally.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                    <span>
                      <strong className="text-[#f4f4f7]">Flaky Test Noise:</strong> Intermittent failures get buried in pipeline outputs, causing teams to lose trust in test signals and delaying critical releases.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                    <span>
                      <strong className="text-[#f4f4f7]">Team Silos:</strong> Distributed teams run test suites independently without shared visibility into overall application health and test ownership.
                    </span>
                  </li>
                </ul>
              </div>

              {/* The Solution Section */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 lg:p-8 space-y-4">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
                  <i className="fas fa-check-circle text-emerald-400"></i> The Solution
                </h2>
                <p className="text-xs text-[#9a9aa5] leading-relaxed">
                  Playwright Dashboard brings all your Playwright test runs into one centralized, real-time reporting hub. It integrates with your existing Playwright configuration using a <strong className="text-[#f4f4f7]">single line of code</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1.5">
                    <h3 className="text-xs font-bold text-[#f4f4f7]">Unified Dashboard</h3>
                    <p className="text-xs text-[#9a9aa5]">Consolidate test runs from GitHub Actions, GitLab CI, Jenkins, and local runs in one place.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1.5">
                    <h3 className="text-xs font-bold text-[#f4f4f7]">Sub-Second Live Streaming</h3>
                    <p className="text-xs text-[#9a9aa5]">Watch pass/fail metrics update live in real time as your test suite executes.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1.5">
                    <h3 className="text-xs font-bold text-[#f4f4f7]">Instant Diagnostics</h3>
                    <p className="text-xs text-[#9a9aa5]">View failure screenshots, video recordings, trace ZIPs, and execution step trees instantly.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1.5">
                    <h3 className="text-xs font-bold text-[#f4f4f7]">Team Access Controls</h3>
                    <p className="text-xs text-[#9a9aa5]">Invite team members by email with granular project Viewer and Admin permissions.</p>
                  </div>
                </div>
              </div>

              {/* Who is Playwright Dashboard for? */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 lg:p-8 space-y-4">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
                  <i className="fas fa-users-cog text-[#3b82f6]"></i> Who is Playwright Dashboard for?
                </h2>
                <p className="text-xs text-[#9a9aa5] leading-relaxed">
                  Playwright Dashboard is purpose-built for engineering and QA automation teams who:
                </p>
                <ul className="space-y-2.5 text-xs text-[#9a9aa5] list-disc list-inside">
                  <li>Run Playwright test suites across <strong className="text-[#f4f4f7]">multiple CI/CD pipelines</strong> (GitHub Actions, GitLab CI, Jenkins, CircleCI).</li>
                  <li>Have <strong className="text-[#f4f4f7]">distributed teams</strong> executing tests across development, staging, and production environments.</li>
                  <li>Need <strong className="text-[#f4f4f7]">centralized visibility</strong> into test trends and pass rates without searching through pipeline logs.</li>
                  <li>Want <strong className="text-[#f4f4f7]">automated flakiness scoring</strong> to isolate flaky tests before they break builds.</li>
                  <li>Require <strong className="text-[#f4f4f7]">secure cloud or self-hosted deployment options</strong> for privacy and compliance.</li>
                </ul>
              </div>

              {/* Key Features Overview */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 lg:p-8 space-y-4">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
                  <i className="fas fa-star text-yellow-400"></i> Key Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-chart-line"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">Live High-Level Analytics</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Pass rate trend graphs, test counts, and duration metrics across projects.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-photo-video"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">Failure Diagnostics</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Embedded failure screenshots, WebM video recordings, and ZIP trace viewers.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-list-ol"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">Step-by-Step Step Trees</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Detailed breakdown of every test case action, locator assertion, and step duration.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-bug"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">Flaky Test Scoring</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Automatic flakiness calculation and quarantine tracking over historical runs.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-user-plus"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">Project Invitations</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Invite teammates by email with automatic permission assignment upon sign-up.</p>
                  </div>
                  <div className="p-4 bg-[#08080a] border border-[#20202a] rounded-xl space-y-1">
                    <div className="text-[#3b82f6] text-base mb-2"><i className="fas fa-key"></i></div>
                    <h3 className="text-xs font-semibold text-[#f4f4f7]">API Keys & Authentication</h3>
                    <p className="text-[11px] text-[#9a9aa5]">Self-service API keys for authenticating Playwright reporters securely.</p>
                  </div>
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('quickstart')}
                  className="p-5 bg-[#14141b] border border-[#3b82f6]/30 hover:border-[#3b82f6] rounded-2xl text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs text-[#3b82f6] font-semibold uppercase">Step 1</span>
                    <h3 className="text-sm font-bold text-[#f4f4f7] group-hover:text-[#3b82f6] transition-colors">
                      Get Started with Quick Start →
                    </h3>
                    <p className="text-xs text-[#9a9aa5] mt-1">4-step guide to connect your Playwright test suite in 2 minutes.</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('reporter')}
                  className="p-5 bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 rounded-2xl text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs text-[#9a9aa5] font-semibold uppercase">Reference</span>
                    <h3 className="text-sm font-bold text-[#f4f4f7] group-hover:text-[#3b82f6] transition-colors">
                      Explore Reporter Options →
                    </h3>
                    <p className="text-xs text-[#9a9aa5] mt-1">View all options for @christmasday/playwright-dashboard-reporter.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* QUICKSTART TAB */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2">
                  <i className="fas fa-bolt text-[#3b82f6]"></i> Quick Setup Guide
                </h2>
                <p className="text-sm text-[#9a9aa5] leading-relaxed">
                  Get up and running with Playwright Dashboard in 4 easy steps. Connect your test suite to stream live pass rates, execution step trees, traces, screenshots, and videos.
                </p>
              </div>

              {/* Step 1 */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6] font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-base font-bold text-[#f4f4f7]">Sign Up & Generate API Key</h3>
                  </div>
                  <Link
                    to="/settings/api-keys"
                    className="px-3 py-1 bg-[#3b82f6] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Generate Key
                  </Link>
                </div>
                <p className="text-xs text-[#9a9aa5]">
                  Sign up for an account on the Playwright Dashboard platform. Once logged in, navigate to <span className="text-[#f4f4f7] font-mono">Settings → API Keys</span> to create a project authentication key.
                </p>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <button
                    onClick={() => copyToClipboard('DASHBOARD_API_KEY=pd_sk_your_generated_api_key_here', 1)}
                    className="absolute top-3 right-3 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans"
                  >
                    {copiedIndex === 1 ? '✓ Copied' : 'Copy'}
                  </button>
                  <pre># Save in your CI environment variables or local .env file
DASHBOARD_API_KEY=pd_sk_your_generated_api_key_here</pre>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6] font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-base font-bold text-[#f4f4f7]">Install the Reporter Package</h3>
                </div>
                <p className="text-xs text-[#9a9aa5]">
                  Install the official custom reporter in your Playwright project repo using npm:
                </p>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <button
                    onClick={() => copyToClipboard('npm i @christmasday/playwright-dashboard-reporter --save-dev', 2)}
                    className="absolute top-3 right-3 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans"
                  >
                    {copiedIndex === 2 ? '✓ Copied' : 'Copy'}
                  </button>
                  <pre>npm i @christmasday/playwright-dashboard-reporter --save-dev</pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6] font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-base font-bold text-[#f4f4f7]">Configure playwright.config.ts</h3>
                </div>
                <p className="text-xs text-[#9a9aa5]">
                  Add the dashboard reporter configuration to your <span className="text-[#f4f4f7] font-mono">playwright.config.ts</span> file:
                </p>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `// playwright.config.ts\nimport { defineConfig } from '@playwright/test';\n\nexport default defineConfig({\n  use: {\n    screenshot: 'only-on-failure',\n    video: 'retain-on-failure',\n    trace: 'retain-on-failure',\n  },\n  reporter: [\n    ['list'],\n    ['@christmasday/playwright-dashboard-reporter', {\n      url: 'http://localhost:3002/api',\n      apiKey: process.env.DASHBOARD_API_KEY,\n      project: 'Main Suite',\n    }],\n  ],\n});`,
                        3
                      )
                    }
                    className="absolute top-3 right-3 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans"
                  >
                    {copiedIndex === 3 ? '✓ Copied' : 'Copy'}
                  </button>
                  <pre>{`// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['@christmasday/playwright-dashboard-reporter', {
      url: 'http://localhost:3002/api',
      apiKey: process.env.DASHBOARD_API_KEY,
      project: 'Main Suite',
    }],
  ],
});`}</pre>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6] font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-base font-bold text-[#f4f4f7]">Run Tests & View Live Results</h3>
                </div>
                <p className="text-xs text-[#9a9aa5]">
                  Execute your Playwright tests as normal. Results will automatically stream in real time to your dashboard!
                </p>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <button
                    onClick={() => copyToClipboard('npx playwright test', 4)}
                    className="absolute top-3 right-3 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans"
                  >
                    {copiedIndex === 4 ? '✓ Copied' : 'Copy'}
                  </button>
                  <pre>npx playwright test</pre>
                </div>
              </div>
            </div>
          )}

          {/* REPORTER TAB */}
          {activeTab === 'reporter' && (
            <div className="space-y-6">
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-bold text-[#f4f4f7] flex items-center gap-2.5">
                  <i className="fas fa-sliders-h text-[#3b82f6]"></i> Reporter Configuration & Options
                </h2>
                <p className="text-sm text-[#9a9aa5] leading-relaxed">
                  Full reference and configuration guide for <span className="font-mono text-[#3b82f6]">@christmasday/playwright-dashboard-reporter</span>.
                </p>
              </div>

              {/* Behavior & Features */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-[#f4f4f7]">Package Behavior</h3>
                <ul className="space-y-2 text-xs text-[#9a9aa5] list-disc list-inside">
                  <li><strong className="text-[#f4f4f7]">Graceful No-Op:</strong> If no API key is provided, the reporter logs a warning and exits cleanly without breaking test execution.</li>
                  <li><strong className="text-[#f4f4f7]">Automated Build Registration:</strong> Registers a new build run via <code className="text-[#f4f4f7]">POST /api/builds</code> when tests complete.</li>
                  <li><strong className="text-[#f4f4f7]">Rich Data Ingestion:</strong> Streams test suites, spec files, test status, step tree breakdowns, locator timings, and diagnostic failure artifacts (screenshots, WebM videos, ZIP traces).</li>
                  <li><strong className="text-[#f4f4f7]">Fail-Safe Error Handling:</strong> Network or reporting errors are caught safely so test suite exit codes remain unaffected.</li>
                </ul>
              </div>

              {/* Options Table */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#0e0e13] border-b border-[#20202a]">
                    <tr>
                      <th className="p-4 text-left font-semibold text-[#f4f4f7]">Option</th>
                      <th className="p-4 text-left font-semibold text-[#f4f4f7]">Env Variable</th>
                      <th className="p-4 text-left font-semibold text-[#f4f4f7]">Default</th>
                      <th className="p-4 text-left font-semibold text-[#f4f4f7]">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20202a] text-[#9a9aa5]">
                    <tr>
                      <td className="p-4 font-mono text-[#3b82f6] font-semibold">apiKey</td>
                      <td className="p-4 font-mono text-[#93c5fd]">DASHBOARD_API_KEY</td>
                      <td className="p-4 font-mono text-gray-500">—</td>
                      <td className="p-4"><strong className="text-amber-400">Required.</strong> Authentication key generated in Settings → API Keys.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-mono text-[#3b82f6] font-semibold">url</td>
                      <td className="p-4 font-mono text-[#93c5fd]">DASHBOARD_URL</td>
                      <td className="p-4 font-mono">http://localhost:3002/api</td>
                      <td className="p-4">Backend API base endpoint.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-mono text-[#3b82f6] font-semibold">project</td>
                      <td className="p-4 font-mono text-[#93c5fd]">DASHBOARD_PROJECT</td>
                      <td className="p-4 font-mono">Default Project</td>
                      <td className="p-4">Project name identifier to group build runs under.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-mono text-[#3b82f6] font-semibold">buildName</td>
                      <td className="p-4 font-mono text-[#93c5fd]">DASHBOARD_BUILD_NAME</td>
                      <td className="p-4 font-mono">ci-&lt;id&gt; / playwright-&lt;ts&gt;</td>
                      <td className="p-4">Custom title or run ID for the build run.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-mono text-[#3b82f6] font-semibold">environment</td>
                      <td className="p-4 font-mono text-[#93c5fd]">DASHBOARD_ENVIRONMENT</td>
                      <td className="p-4 font-mono">ci</td>
                      <td className="p-4">Target environment tag (e.g. <code className="text-[#f4f4f7]">staging</code>, <code className="text-[#f4f4f7]">production</code>, <code className="text-[#f4f4f7]">ci</code>).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sample Code */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-[#f4f4f7]">Full Configuration Example</h3>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <pre>{`// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['@christmasday/playwright-dashboard-reporter', {
      url: process.env.DASHBOARD_URL || 'http://localhost:3002/api',
      apiKey: process.env.DASHBOARD_API_KEY,
      project: 'Main Suite',
      buildName: process.env.GITHUB_RUN_ID ? \`ci-\${process.env.GITHUB_RUN_ID}\` : undefined,
      environment: process.env.NODE_ENV || 'ci',
    }],
  ],
});`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* GITHUB ACTION (VERIFIED) TAB */}
          {activeTab === 'github-action' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#08080a] border border-[#20202a] flex items-center justify-center text-[#f4f4f7] text-xl">
                      <i className="fab fa-github"></i>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-[#f4f4f7]">easytesting/playwright-dashboard-action</h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-[#60a5fa] border border-blue-500/30">
                          <i className="fas fa-check-circle text-[10px]"></i> Verified Creator
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#20202a] text-[#9a9aa5]">
                          v1.0.0
                        </span>
                      </div>
                      <p className="text-xs text-[#9a9aa5] mt-0.5">
                        Official GitHub Action for Playwright Dashboard by <strong className="text-[#f4f4f7]">EasyTesting</strong>.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://github.com/marketplace?type=actions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#20202a] hover:bg-[#282836] text-xs font-semibold text-[#f4f4f7] rounded-xl border border-[#303040] transition-colors inline-flex items-center gap-1.5"
                  >
                    <i className="fas fa-external-link-alt text-[10px]"></i> View Marketplace
                  </a>
                </div>
                <p className="text-xs text-[#9a9aa5] leading-relaxed">
                  Integrate Playwright test reporting, automated flaky test detection, failure screenshot & video bundling, and interactive trace uploads into your CI pipeline in just <strong>3 lines of YAML</strong>.
                </p>
              </div>

              {/* 3-Line Drop-in Card */}
              <div className="bg-[#101017] border border-[#3b82f6]/30 rounded-2xl p-6 space-y-4 shadow-lg shadow-[#3b82f6]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="text-base font-bold text-[#f4f4f7]">3-Line Quick Drop-in</h3>
                  </div>
                  <span className="text-xs text-[#60a5fa] font-semibold bg-[#3b82f6]/10 px-2.5 py-1 rounded-lg border border-[#3b82f6]/20">
                    Zero Extra Config Needed
                  </span>
                </div>
                <p className="text-xs text-[#9a9aa5]">
                  Add this step after your <code className="text-[#f4f4f7] font-mono">playwright test</code> command in your GitHub Actions workflow:
                </p>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `- name: Report to Playwright Dashboard\n  if: always()\n  uses: easytesting/playwright-dashboard-action@v1\n  with:\n    api-key: \${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}`,
                        10
                      )
                    }
                    className="absolute top-3 right-3 text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans px-2.5 py-1 bg-[#14141b] rounded-lg border border-[#20202a]"
                  >
                    {copiedIndex === 10 ? '✓ Copied' : 'Copy 3 Lines'}
                  </button>
                  <pre>{`- name: Report to Playwright Dashboard
  if: always()
  uses: easytesting/playwright-dashboard-action@v1
  with:
    api-key: \${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}`}</pre>
                </div>
              </div>

              {/* Step-by-Step Setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold flex items-center justify-center">1</span>
                    <h4 className="text-sm font-bold text-[#f4f4f7]">Add Secret to GitHub Repo</h4>
                  </div>
                  <p className="text-xs text-[#9a9aa5] leading-relaxed">
                    In your GitHub Repository, navigate to <strong>Settings → Secrets and variables → Actions → New repository secret</strong>. Name it <code className="text-[#93c5fd] font-mono">PLAYWRIGHT_DASHBOARD_API_KEY</code> and paste your API key from <Link to="/settings/api-keys" className="text-[#3b82f6] underline">Settings → API Keys</Link>.
                  </p>
                </div>

                <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold flex items-center justify-center">2</span>
                    <h4 className="text-sm font-bold text-[#f4f4f7]">Automatic Artifact Uploads</h4>
                  </div>
                  <p className="text-xs text-[#9a9aa5] leading-relaxed">
                    The action automatically scans for Playwright JSON reports, trace archives (<code className="text-[#93c5fd]">trace.zip</code>), WebM video captures, and PNG screenshots, uploading them directly to your dashboard.
                  </p>
                </div>
              </div>

              {/* Complete End-to-End Workflow YAML */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#f4f4f7]">Full Workflow Example (.github/workflows/playwright.yml)</h3>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `name: Playwright Tests\non:\n  push:\n    branches: [ main ]\n  pull_request:\n\njobs:\n  test:\n    timeout-minutes: 60\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: 'npm'\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Install Playwright Browsers\n        run: npx playwright install --with-deps\n\n      - name: Run Playwright tests\n        run: npx playwright test\n\n      - name: Publish Results to Playwright Dashboard\n        if: always()\n        uses: easytesting/playwright-dashboard-action@v1\n        with:\n          api-key: \${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}\n          project: 'Web App E2E'\n          upload-traces: true\n          comment-on-pr: true`,
                        11
                      )
                    }
                    className="text-[#9a9aa5] hover:text-[#f4f4f7] text-xs font-sans px-3 py-1.5 bg-[#14141b] rounded-lg border border-[#20202a]"
                  >
                    {copiedIndex === 11 ? '✓ Copied Full YAML' : 'Copy Full YAML'}
                  </button>
                </div>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd] overflow-x-auto">
                  <pre>{`name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      # EasyTesting Verified Action Step
      - name: Publish Results to Playwright Dashboard
        if: always()
        uses: easytesting/playwright-dashboard-action@v1
        with:
          api-key: \${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}
          project: 'Web App E2E'
          upload-traces: true
          comment-on-pr: true`}</pre>
                </div>
              </div>

              {/* Action Inputs Reference */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#20202a]">
                  <h3 className="text-sm font-bold text-[#f4f4f7]">Action Input Parameters</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0e0e13] border-b border-[#20202a]">
                      <tr>
                        <th className="p-3.5 font-semibold text-[#f4f4f7]">Input</th>
                        <th className="p-3.5 font-semibold text-[#f4f4f7]">Required</th>
                        <th className="p-3.5 font-semibold text-[#f4f4f7]">Default</th>
                        <th className="p-3.5 font-semibold text-[#f4f4f7]">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#20202a] text-[#9a9aa5]">
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">api-key</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-red-500/10 text-red-400 font-bold rounded text-[10px]">Required</span></td>
                        <td className="p-3.5 font-mono text-gray-500">—</td>
                        <td className="p-3.5">API key generated in your Playwright Dashboard Settings.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">project</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px]">Optional</span></td>
                        <td className="p-3.5 font-mono text-[#93c5fd]">{'${{ github.repository }}'}</td>
                        <td className="p-3.5">Project group identifier inside the dashboard.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">dashboard-url</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px]">Optional</span></td>
                        <td className="p-3.5 font-mono text-xs">https://playwright-dashboard.easytesting.app/api</td>
                        <td className="p-3.5">API base URL of your Playwright Dashboard instance.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">report-path</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px]">Optional</span></td>
                        <td className="p-3.5 font-mono">playwright-report</td>
                        <td className="p-3.5">Path to the directory containing test results and artifacts.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">upload-traces</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px]">Optional</span></td>
                        <td className="p-3.5 font-mono">true</td>
                        <td className="p-3.5">Automatically upload trace ZIP files for in-app interactive inspection.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[#60a5fa] font-semibold">comment-on-pr</td>
                        <td className="p-3.5"><span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px]">Optional</span></td>
                        <td className="p-3.5 font-mono">true</td>
                        <td className="p-3.5">Post an automated status comment on pull requests with direct test & trace links.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CICD TAB */}
          {activeTab === 'cicd' && (
            <div className="space-y-6">
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-bold text-[#f4f4f7]">CI/CD Pipeline Integration</h2>
                <p className="text-sm text-[#9a9aa5]">
                  Integrate Playwright Dashboard into GitHub Actions, GitLab CI, or Jenkins pipelines.
                </p>
              </div>

              {/* GitHub Action Highlight */}
              <div className="bg-[#101017] border border-[#3b82f6]/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 text-[#3b82f6] flex items-center justify-center text-sm">
                      <i className="fab fa-github"></i>
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[#f4f4f7]">GitHub Actions (Recommended)</h3>
                      <p className="text-xs text-[#9a9aa5]">Use the verified 3-line GitHub Action</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('github-action')}
                    className="px-3.5 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                  >
                    View Verified Action Docs →
                  </button>
                </div>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <pre>{`- name: Report to Playwright Dashboard
  if: always()
  uses: easytesting/playwright-dashboard-action@v1
  with:
    api-key: \${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}`}</pre>
                </div>
              </div>

              {/* Generic CI Workflow */}
              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-[#f4f4f7]">Standard Node.js / NPM CI Runner</h3>
                <div className="relative bg-[#08080a] border border-[#20202a] rounded-xl p-4 font-mono text-xs text-[#93c5fd]">
                  <pre>{`# Execute tests with dashboard environment variables
DASHBOARD_API_KEY=\${{ secrets.DASHBOARD_API_KEY }} \\
DASHBOARD_PROJECT="main-suite" \\
npx playwright test`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-bold text-[#f4f4f7]">Team Management & Project Invitations</h2>
                <p className="text-sm text-[#9a9aa5]">
                  Collaborate with your team by inviting members to view or administer specific test projects.
                </p>
              </div>

              <div className="bg-[#101017] border border-[#20202a] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-[#f4f4f7]">How to Invite Team Members</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs text-[#9a9aa5]">
                  <li>Navigate to the <span className="text-[#f4f4f7] font-semibold">Projects</span> page.</li>
                  <li>Click <span className="text-[#3b82f6] font-semibold">Members & Access</span> on the project card.</li>
                  <li>Type the user's email address or username and select their role (<span className="text-[#f4f4f7]">Viewer</span> or <span className="text-[#f4f4f7]">Admin</span>).</li>
                  <li>Click <span className="text-[#3b82f6] font-semibold">Send Invite</span>. If the user already has an account, they get instant access. If not, a pending invitation is saved and will auto-accept as soon as they sign up!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Docs;
