import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('1-Click Jira & GitHub Issue Sync UI', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate with credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('navigates to Issue Tracker Integrations page and displays GitHub & Jira settings', async ({ page }) => {
    // Navigate to integrations settings
    await page.goto('/settings/integrations');
    await page.waitForURL('**/settings/integrations');

    // Check title and provider status
    await expect(page.getByRole('heading', { name: /Issue Tracker Integrations/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GitHub Issues/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Jira Software/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Linked Test Issues/i })).toBeVisible();

    // Check GitHub form elements
    await expect(page.getByRole('heading', { name: 'GitHub Integration' })).toBeVisible();
    await expect(page.getByPlaceholder('e.g. facebook, microsoft, your-org')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. playwright, my-app')).toBeVisible();

    // Switch to Jira tab
    await page.getByRole('button', { name: /Jira Software/i }).click();
    await expect(page.getByRole('heading', { name: 'Jira Software Integration' })).toBeVisible();
    await expect(page.getByPlaceholder('https://your-domain.atlassian.net')).toBeVisible();
    await expect(page.getByPlaceholder('engineer@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. QA, PLAY, PROJ')).toBeVisible();
  });

  test('tests connection to GitHub with mock response', async ({ page }) => {
    await page.goto('/settings/integrations');

    // Intercept test connection route
    await page.route('**/api/integrations/test-connection', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Connected to GitHub repository acme/e2e-tests (admin permissions)',
        }),
      });
    });

    // Fill in repo fields
    await page.fill('input[placeholder="e.g. facebook, microsoft, your-org"]', 'acme');
    await page.fill('input[placeholder="e.g. playwright, my-app"]', 'e2e-tests');
    await page.fill('input[type="password"]', 'ghp_mocktoken1234567890abcdef');

    // Click test connection
    await page.getByRole('button', { name: /Test Connection/i }).click();

    // Verify success banner appears
    await expect(page.getByText('Connected to GitHub repository acme/e2e-tests')).toBeVisible();
  });

  test('displays 1-click issue sync modal and linked issue badges on test details page', async ({ page }) => {
    // Mock test details API response
    const mockTestRun = {
      id: 'mock-test-id-1234',
      name: 'Authentication flow with MFA token expiration',
      title: 'Authentication flow with MFA token expiration',
      file: 'tests/auth/mfa.spec.ts',
      status: 'failed',
      duration: 3420,
      retries: 1,
      error: 'TimeoutError: locator.waitFor: Timeout 5000ms exceeded waiting for locator("#mfa-code")',
      stackTrace: 'Error: Timeout 5000ms exceeded\n    at LoginPage.submitMfa (tests/pages/login.ts:42:15)',
      steps: [
        { id: 'step-1', stepNumber: 1, stepTitle: 'Navigate to login', status: 'passed', duration: 120 },
        { id: 'step-2', stepNumber: 2, stepTitle: 'Wait for MFA input', status: 'failed', duration: 3300, error: 'Timeout waiting for #mfa-code' },
      ],
      artifacts: [],
    };

    const mockAiAnalysis = {
      category: 'Selector Timeout / Dynamic Element',
      rootCause: 'MFA input field was not rendered before timeout triggered due to delayed animation.',
      recommendedFix: 'await page.locator("#mfa-code").waitFor({ state: "visible", timeout: 10000 });',
      confidence: 0.94,
    };

    const mockExistingLinks = [
      {
        id: 'link-101',
        provider: 'jira',
        issue_id: '10042',
        issue_key: 'QA-512',
        issue_url: 'https://acme.atlassian.net/browse/QA-512',
        issue_title: '[Failure] Authentication flow with MFA token expiration',
        issue_status: 'IN PROGRESS',
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    // Intercept test details
    await page.route('**/api/tests/**mock-test-id-1234', async (route) => {
      const url = route.request().url();
      if (url.includes('ai-analysis')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockAiAnalysis }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTestRun),
        });
      }
    });

    // Intercept AI analysis
    await page.route('**/api/ai/tests/**/analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockAiAnalysis }),
      });
    });

    // Intercept linked issues
    await page.route('**/api/integrations/issues/linked*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockExistingLinks }),
      });
    });

    // Intercept integration configs
    await page.route('**/api/integrations/configs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'cfg-1',
              provider: 'github',
              enabled: true,
              config: { owner: 'acme', repo: 'e2e-tests', default_labels: ['playwright', 'bug'] },
            },
            {
              id: 'cfg-2',
              provider: 'jira',
              enabled: true,
              config: { host_url: 'https://acme.atlassian.net', email: 'dev@acme.com', project_key: 'QA' },
            },
          ],
        }),
      });
    });

    // Intercept issue creation
    await page.route('**/api/integrations/issues/create', async (route) => {
      const payload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'link-102',
            provider: payload.provider,
            issue_id: 'issue-999',
            issue_key: payload.provider === 'jira' ? 'QA-999' : '#88',
            issue_url: payload.provider === 'jira' ? 'https://acme.atlassian.net/browse/QA-999' : 'https://github.com/acme/e2e-tests/issues/88',
            issue_title: payload.title,
            issue_status: 'OPEN',
            created_at: new Date().toISOString(),
          },
        }),
      });
    });

    // Intercept issue sync
    await page.route('**/api/integrations/issues/**/sync*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...mockExistingLinks[0],
            issue_status: 'RESOLVED',
            last_synced_at: new Date().toISOString(),
          },
        }),
      });
    });

    // Navigate to test details
    await page.goto('/tests/mock-test-id-1234');
    await page.waitForURL('**/tests/mock-test-id-1234*');

    // Verify "Sync to Jira / GitHub" action button exists in header
    const syncButton = page.getByRole('button', { name: /Sync to Jira \/ GitHub/i });
    await expect(syncButton).toBeVisible();

    // Verify existing linked issue badge is displayed
    await expect(page.getByText('QA-512')).toBeVisible();
    await expect(page.getByText('IN PROGRESS')).toBeVisible();

    // Test status sync button
    const syncStatusBtn = page.getByRole('button', { name: 'Refresh issue status' });
    await syncStatusBtn.click();
    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page.getByText('RESOLVED')).toBeVisible();

    // Open 1-Click Issue Sync Modal
    await syncButton.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /1-Click Issue Sync/i })).toBeVisible();

    // Check pre-filled title in modal
    const titleInput = modal.locator('input[placeholder="[Failure] Test title"]');
    await expect(titleInput).toHaveValue(/Authentication flow with MFA/i);

    // Switch between details and markdown preview
    await modal.getByRole('button', { name: /Markdown Preview/i }).click();
    await expect(modal.getByText(/AI Root Cause & Fix Analysis/i)).toBeVisible();
    await expect(modal.getByText(/Timeout 5000ms exceeded/i)).toBeVisible();

    // Switch back to details form
    await modal.getByRole('button', { name: /Details/i }).click();

    // Submit GitHub Issue
    await modal.getByRole('button', { name: /Create GitHub Issue/i }).click();

    // Modal should close and new linked issue appears
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('#88')).toBeVisible();
  });
});
