# Playwright Dashboard

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/christmasday/playwright-dashboard?style=social)](https://github.com/christmasday/Playwright-dashboard)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-easytesting%2Fplaywright--dashboard--action-blue?logo=github-actions&logoColor=white)](https://github.com/marketplace?type=actions)
[![Discord Community](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/vx2Q4rPK8g)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)

**The centralized, real-time test management & reporting platform for Playwright E2E automation teams.**

[Live Platform](https://playwright-dashboard.easytesting.app) • [Features](#-features) • [Quick Start](#-quick-start) • [GitHub Action](#-github-actions-integration) • [Reporter Options](#-reporter-options) • [Project Structure](#-project-structure) • [Comparison](#-comparison) • [Documentation](#-in-app-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**Playwright Dashboard** brings all your Playwright test runs into one unified, real-time reporting hub. Whether your tests run on GitHub Actions, GitLab CI, Jenkins, staging servers, or local developer machines, Playwright Dashboard gives your entire team sub-second visibility into test execution, failure diagnostics, flakiness scoring, and historical trends.

Available as both a **100% free cloud platform** at [playwright-dashboard.easytesting.app](https://playwright-dashboard.easytesting.app) and an easily deployed **self-hosted instance**.

---

## 🌟 Features

### 🚀 Real-Time Monitoring & Execution Dashboards
- **Sub-Second Live Streaming**: Test results stream in real time via WebSockets as suites execute.
- **Interactive Analytics**: Visual charts powered by Recharts showing pass/fail distributions, duration trends, and suite health over time.
- **Multi-Environment Support**: Organize runs by environment (`staging`, `production`, `ci`, `local`).

### 🔍 Deep Failure Diagnostics & Step Trees
- **Interactive Execution Step Trees**: Accordion breakdown of test actions, locators, assertions, and per-step execution durations.
- **Embedded Visual Artifacts**: Instant in-app playback of **WebM video recordings**, full-resolution failure **screenshots**, and downloadable **ZIP execution traces**.
- **Stack Trace & Terminal Viewer**: Syntax-highlighted error logs with precise `file:line` source context and searchable terminal outputs.

### 🎯 Automated Flaky Test Detection & Quarantine
- **Flakiness Scoring Engine**: Automatically identifies intermittent failures and calculates stability percentages over historical runs.
- **Quarantine Management**: Quarantine flaky tests to protect CI build signals while tracking remediation progress.

### 👥 Team Management & Project Access Controls
- **Granular Roles**: Assign `Viewer`, `Editor`, `Maintainer`, or `Admin` permissions.
- **Email & Username Invites**: Invite teammates seamlessly. Invitations sent to unregistered teammates automatically link upon sign-up.
- **Self-Service API Key Management**: Generate, label, and revoke scoped API keys (`pd_sk_...`) for CI/CD ingestion.

### 🔄 CI/CD & GitHub Actions Ecosystem
- **Official GitHub Action**: Drop-in 3-line integration via `easytesting/playwright-dashboard-action@v1`.
- **Custom Reporter Package**: Lightweight `@christmasday/playwright-dashboard-reporter` with fail-safe error handling and automatic build registration.
- **Automated PR Comments**: Optional pull request summary comments with direct deep links to failed tests and trace viewers.

---

## 🚀 Quick Start

You can connect your Playwright test suite to Playwright Dashboard in **under 2 minutes** using either the verified GitHub Action or the custom reporter package.

### Option A: GitHub Action (Recommended for CI)

Add the verified action step after your test execution in `.github/workflows/playwright.yml`:

```yaml
- name: Run Playwright Tests
  run: npx playwright test

# 3-Line Drop-in Step
- name: Report to Playwright Dashboard
  if: always()
  uses: easytesting/playwright-dashboard-action@v1
  with:
    api-key: ${{ secrets.PLAYWRIGHT_DASHBOARD_API_KEY }}
    project: 'Web App E2E'
    upload-traces: true
    comment-on-pr: true
```

---

### Option B: Custom Reporter Package (Local & Any CI)

#### 1. Sign Up & Generate API Key
1. Register on [Playwright Dashboard](https://playwright-dashboard.easytesting.app/signup) (or your local instance at `http://localhost:5173/signup`).
2. Go to **Settings → API Keys** and click **Create Key**.
3. Copy your API Key (`pd_sk_...`) and store it securely (e.g. in your `.env` or CI secrets as `DASHBOARD_API_KEY`).

#### 2. Install the Reporter Package
```bash
npm install @christmasday/playwright-dashboard-reporter --save-dev
```

#### 3. Configure `playwright.config.ts`
```typescript
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
      url: process.env.DASHBOARD_URL || 'https://playwright-dashboard.easytesting.app/api',
      apiKey: process.env.DASHBOARD_API_KEY,
      project: 'Web App E2E',
      environment: process.env.NODE_ENV || 'ci',
    }],
  ],
});
```

#### 4. Run Tests & Watch Results Stream Live
```bash
npx playwright test
```

---

## ⚙️ Reporter Options

Configuration parameters for `@christmasday/playwright-dashboard-reporter`:

| Option | Environment Variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `DASHBOARD_API_KEY` | *None* | **Required.** API authentication key generated in Settings → API Keys. |
| `url` | `DASHBOARD_URL` | `https://playwright-dashboard.easytesting.app/api` | Base API endpoint |
| `project` | `DASHBOARD_PROJECT` | `'Default Project'` | Project name identifier to group build runs under. |
| `buildName` | `DASHBOARD_BUILD_NAME` | `ci-<run_id>` / `playwright-<ts>` | Custom name or identifier for the build execution. |
| `environment` | `DASHBOARD_ENVIRONMENT` | `'ci'` | Target environment tag (`'ci'`, `'staging'`, `'production'`, `'local'`). |

---

## 📁 Project Structure

This repository is organized as a unified monorepo:

```text
playwright-dashboard-project/
├── frontend/                     # Vite + React + TypeScript web application
│   ├── src/
│   │   ├── components/           # Reusable UI components, Modals, Step Trees & Sidebar
│   │   │   ├── Auth/             # Route authentication guards (RequireAuth, PublicOnly)
│   │   │   ├── Common/           # Layout, Sidebar, Navbar components
│   │   │   ├── Filtering/        # Test status, flakiness & date range filters
│   │   │   ├── Orchestration/    # Parallelization & quarantine controls
│   │   │   ├── Projects/         # Project creation & team member invitation modals
│   │   │   └── Visualization/    # Recharts metrics, pass rate graphs & video/trace players
│   │   ├── pages/                # Dashboard, Builds, BuildDetails, TestDetails, FlakyTests,
│   │   │                         # Projects, UserManagement, ApiKeys, ProfileSettings, Docs, Auth
│   │   ├── services/             # Axios API client & WebSocket real-time subscribers
│   │   ├── store/                # Zustand client state management stores
│   │   └── styles/               # Tailwind CSS & custom design tokens
│   └── public/                   # Static landing page & media assets
├── backend/                      # Node.js + Express REST API & WebSocket server
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/      # Auth, Build, TestRun, Project, Webhook & API Key controllers
│   │   │   ├── routes/           # Express router endpoints
│   │   │   └── services/         # Ingestion engine, flakiness analyzer & notification dispatchers
│   │   ├── config/               # Environment variables, database & Redis configurations
│   │   ├── db/
│   │   │   ├── migrations/       # SQL schema migrations (001 to 006)
│   │   │   └── index.js          # PostgreSQL connection pooling & query helper
│   │   ├── middleware/           # JWT verification, API key auth, rate limiting & error handling
│   │   └── websocket/            # WebSocket server for real-time dashboard events
│   └── e2e/                      # Playwright E2E test suites for API & UI regression
├── reporter/                     # Official @christmasday/playwright-dashboard-reporter package
├── supabase/                     # Supabase local configuration & schemas
├── docker-compose.yml            # Dockerized development services (Redis, Backend API)
├── vercel.json                   # Vercel deployment routing configuration
└── README.md                     # Project documentation & guides
```

---

## 🆚 Comparison

| Capability | Playwright Dashboard | TestRail | TestProject | Allure Report |
| :--- | :---: | :---: | :---: | :---: |
| **Real-Time Live Streaming** | ✅ Sub-second WebSockets | ❌ Manual Refresh | ⚠️ 2-3s Delay | ❌ Static HTML |
| **Hosting Flexibility** | ✅ Cloud & Self-Hosted | ❌ Cloud only | ❌ Cloud only | ⚠️ Self-hosted only |
| **Failure Screenshots & Video** | ✅ Embedded Player | ⚠️ Attachments only | ⚠️ Limited | ⚠️ Static images |
| **Interactive ZIP Trace Viewing**| ✅ Instant Integration | ❌ No | ❌ No | ❌ No |
| **Automated Flaky Scoring** | ✅ Built-in Engine | ❌ Manual | ⚠️ Basic | ❌ No |
| **Step-by-Step Locator Trees** | ✅ Expandable Tree | ❌ No | ⚠️ Basic | ⚠️ Logs only |
| **Team Member Invitations** | ✅ Granular Roles | ⚠️ Paid Add-on | ⚠️ Paid Add-on | ❌ No |
| **Pricing** | ✅ Free & Open Source | ❌ Paid Enterprise | ❌ Paid / Discontinued | ✅ Open Source |

---

## 🛠️ Local Development & Setup

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`
- **PostgreSQL** or **Supabase** instance
- **Redis** (optional, for caching & WebSocket pub/sub)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/christmasday/Playwright-dashboard.git
cd Playwright-dashboard
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in root, `backend/.env`, and `frontend/.env`:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 3. Run Database Migrations
```bash
npm run migrate
```

### 4. Start Development Servers
Run both backend and frontend concurrently:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Landing Page**: `http://localhost:5173/landing.html`
- **Backend API**: `http://localhost:3002/api`
- **Documentation**: `http://localhost:5173/docs`

### 5. Running with Docker
```bash
# Start backend and Redis containers
npm run docker:up

# View container logs
npm run docker:logs

# Stop containers
npm run docker:down
```

---

## 🧪 Testing

Run backend, frontend, and end-to-end test suites:

```bash
# Run unit & component tests
npm run test

# Run backend API Playwright E2E tests
npm run test:e2e

# View Playwright test report
npm run test:e2e:report
```

---

## 📚 In-App Documentation

Comprehensive guides, reporter option tables, team permission workflows, and CI/CD examples are built into the web application at [`/docs`](https://playwright-dashboard.easytesting.app/docs):

- **Platform Overview & Problems Solved**
- **4-Step Quick Start Walkthrough**
- **Official GitHub Action Reference**
- **Reporter Configuration & Environmental Overrides**
- **CI/CD Integration Guides (GitHub Actions, GitLab CI, Jenkins)**
- **Team Access & Project Permissions**

---

## 🤝 Contributing

We welcome contributions from the community! To contribute:

1. **Fork the Repository**: [github.com/christmasday/Playwright-dashboard](https://github.com/christmasday/Playwright-dashboard)
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Your Changes**: `git commit -m 'feat: Add amazing feature'`
4. **Push to the Branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**: Submit a detailed PR description for review.

Please ensure all tests pass and code adheres to project linting standards (`npm run lint` and `npm run type-check`).

---

## 📄 License & Community

Distributed under the **MIT License**. See [`LICENSE`](file:///Users/Fabian/Desktop/playwright-dashboard-project/LICENSE) for more information.

- **GitHub Repository**: [christmasday/Playwright-dashboard](https://github.com/christmasday/Playwright-dashboard)
- **Issues & Feature Requests**: [GitHub Issues](https://github.com/christmasday/Playwright-dashboard/issues)
- **Discord Community**: [Join the Discord](https://discord.gg/vx2Q4rPK8g)
- **Maintainer**: [@christmasday](https://github.com/christmasday)

<div align="center">

**⭐ If you find Playwright Dashboard helpful, please consider giving it a star on GitHub! ⭐**

*Built with ❤️ for the Playwright and QA automation engineering community.*

</div>
