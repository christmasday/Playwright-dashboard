# @christmasday/playwright-dashboard-reporter

[![npm version](https://img.shields.io/npm/v/@christmasday/playwright-dashboard-reporter.svg)](https://www.npmjs.com/package/@christmasday/playwright-dashboard-reporter)
[![Playwright](https://img.shields.io/badge/Playwright-v1.30%2B-2EAD33.svg?logo=playwright)](https://playwright.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official [Playwright](https://playwright.dev) test reporter for the [Playwright Dashboard](https://playwright-dashboard.easytesting.app).

Streams test run outcomes, execution step trees, root-cause failure diagnostics, call stack frames, Playwright trace files (`.zip`), screenshots, and videos directly to your cloud or self-hosted dashboard.

---

## ⚡ 3-Line GitHub Action (Fastest Setup)

If you use GitHub Actions, you can stream results without modifying your test scripts using the verified GitHub Action:

```yaml
- name: Upload Results to Playwright Dashboard
  uses: easytesting/playwright-dashboard-action@v1
  if: always()
  with:
    api-key: ${{ secrets.DASHBOARD_API_KEY }}
```

---

## 📦 Installation

```bash
# npm
npm install @christmasday/playwright-dashboard-reporter --save-dev

# yarn
yarn add @christmasday/playwright-dashboard-reporter --dev

# pnpm
pnpm add -D @christmasday/playwright-dashboard-reporter
```

---

## ⚙️ Configuration & Usage

Add the reporter to your `playwright.config.ts` (or `playwright.config.js`):

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Capture artifacts on failure for rich diagnostics
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['@christmasday/playwright-dashboard-reporter', {
      url: process.env.DASHBOARD_URL || 'https://playwright-dashboard.easytesting.app/api',
      apiKey: process.env.DASHBOARD_API_KEY, // Generated in Settings -> API Keys
      projectName: 'E2E Web App', // Target project in Dashboard
      buildName: process.env.GITHUB_RUN_ID ? `ci-${process.env.GITHUB_RUN_ID}` : undefined,
    }],
  ],
});
```

---

## 🔐 Environment Variables

Set your `DASHBOARD_API_KEY` in your environment or CI/CD secret manager:

```bash
# Production Cloud Dashboard
export DASHBOARD_API_KEY="pd_sk_live_your_api_key_here"

# Optional: Override for self-hosted instance (defaults to cloud endpoint)
export DASHBOARD_URL="https://playwright-dashboard.easytesting.app/api"

# Run Playwright tests
npx playwright test
```

---

## 🛠️ Reporter Options Reference

| Option        | Environment Variable    | Default                                         | Description                                                                 |
|---------------|-------------------------|-------------------------------------------------|-----------------------------------------------------------------------------|
| `apiKey`      | `DASHBOARD_API_KEY`     | —                                               | **Required** to authenticate and enable test reporting.                      |
| `url`         | `DASHBOARD_URL`         | `https://playwright-dashboard.easytesting.app/api` | Base API URL of your Playwright Dashboard instance.                       |
| `projectName` | `DASHBOARD_PROJECT`     | `Default Project`                               | Name of the target project in the dashboard.                                |
| `buildName`   | `DASHBOARD_BUILD_NAME`  | `ci-<run_id>` / `playwright-<timestamp>`        | Custom name or CI build identifier.                                         |

---

## 🔍 What Gets Captured & Streamed

1. **Granular Execution Steps & Lifecycle:**
   - Setup fixtures, `test.step()` blocks, locator actions, assertions, and teardown hooks with per-step execution durations.
2. **Root-Cause Error Diagnostics & Stack Traces:**
   - Exact failure reasons, assertion diffs (Expected vs. Received), and structured V8/Node.js stack frames with spec line & column locations.
3. **Artifacts & Media:**
   - Full Playwright `.zip` traces (with integrated web Trace Viewer inspection), failure screenshots (`.png`/`.jpg`), and video recordings (`.webm`/`.mp4`).
4. **Flakiness & Retries:**
   - Tracks flaky test retries, quarantine status, and historical stability trends over time.

---

## 🤖 CI/CD Workflow Examples

### GitHub Actions (`.github/workflows/playwright.yml`)

```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright Tests
        run: npx playwright test
        env:
          DASHBOARD_API_KEY: ${{ secrets.DASHBOARD_API_KEY }}
          DASHBOARD_PROJECT: "Main App E2E"
```

### GitLab CI (`.gitlab-ci.yml`)

```yaml
stages:
  - test

playwright_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  script:
    - npm ci
    - npx playwright test
  variables:
    DASHBOARD_API_KEY: $DASHBOARD_API_KEY
    DASHBOARD_PROJECT: "GitLab CI Pipeline"
```

---

## 🛡️ Fail-Safe Design

- **Graceful No-Op:** If `DASHBOARD_API_KEY` is not provided (e.g. local quick runs or unauthenticated PR forks), the reporter prints a friendly notice and exits without interfering with your test run.
- **Non-Blocking Errors:** Network timeouts or dashboard connectivity issues will never fail or interrupt your CI/CD test execution pipeline.

---

## 📄 License

[MIT](LICENSE) © Playwright Dashboard
