import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Custom Storage Timeframe & Data Retention UI', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate with credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('navigates to Storage settings and renders exact retention table matrix', async ({ page }) => {
    // Navigate via URL or sidebar
    await page.goto('/settings/storage');
    await page.waitForURL('**/settings/storage');

    // Verify main page title
    await expect(page.getByRole('heading', { name: /Storage & Data Retention/i })).toBeVisible();

    // Verify card header from user design
    await expect(page.getByRole('heading', { name: 'Storage', exact: true })).toBeVisible();
    await expect(page.getByText('Data retention and storage options.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible();

    // Verify all 5 categories + BYOS row exist
    await expect(page.getByText('Artifacts (Passed Tests)')).toBeVisible();
    await expect(page.getByText('Artifacts (Failed, Flaky or Quarantined Tests)')).toBeVisible();
    await expect(page.getByText('Test Results')).toBeVisible();
    await expect(page.getByText('Test Details')).toBeVisible();
    await expect(page.getByText('Reports & Analytics')).toBeVisible();
    await expect(page.getByRole('table').getByText('Bring Your Own Storage')).toBeVisible();

    // Verify standard plan default values from design
    await expect(page.getByText('7 days').first()).toBeVisible();
    await expect(page.getByText('21 days').first()).toBeVisible();
    await expect(page.getByText('90 days').first()).toBeVisible();
    await expect(page.getByText('30 days').first()).toBeVisible();
    await expect(page.getByText('365 days').first()).toBeVisible();
  });

  test('configures custom timeframe for passed test artifacts', async ({ page }) => {
    await page.goto('/settings/storage');

    // Click on "Artifacts (Passed Tests)" row to open custom timeframe modal
    const passedRow = page.getByRole('row', { name: /Artifacts \(Passed Tests\)/i });
    await passedRow.click();

    // Modal should be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Custom Storage Timeframe/i })).toBeVisible();
    await expect(modal.getByText('Artifacts (Passed Tests)', { exact: true })).toBeVisible();

    // Select "14 days" preset
    await modal.getByRole('button', { name: '14 days' }).click();

    // Save custom timeframe
    await modal.getByRole('button', { name: /Set Timeframe/i }).click();

    // Modal should close and table displays Custom (14d)
    await expect(modal).not.toBeVisible();
    await expect(page.getByText(/Custom \(14d\)/i)).toBeVisible();
  });

  test('configures Bring Your Own Storage (BYOS) with mock connection test', async ({ page }) => {
    await page.goto('/settings/storage');

    // Intercept test BYOS endpoint
    await page.route('**/api/storage/test-byos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Connected successfully to S3 bucket "acme-artifacts" in us-west-2.',
          bucket: 'acme-artifacts',
          region: 'us-west-2',
        }),
      });
    });

    // Click on Bring Your Own Storage row
    const byosRow = page.getByRole('row', { name: /Bring Your Own Storage/i });
    await byosRow.click();

    // BYOS modal opens
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Bring Your Own Storage/i })).toBeVisible();

    // Fill form
    await modal.locator('input[placeholder*="acme-playwright-artifacts"]').fill('acme-artifacts');
    await modal.locator('input[placeholder*="us-east-1"]').fill('us-west-2');

    // Click test connection
    await modal.getByRole('button', { name: /Test Connection/i }).click();
    await expect(modal.getByText('Connected successfully to S3 bucket "acme-artifacts"')).toBeVisible();

    // Save BYOS
    await modal.getByRole('button', { name: /Save Storage/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test('triggers dry-run retention cleanup check', async ({ page }) => {
    await page.goto('/settings/storage');

    // Click Dry-Run Check button
    const dryRunBtn = page.getByRole('button', { name: /Dry-Run Check/i });
    await expect(dryRunBtn).toBeVisible();
    await dryRunBtn.click();

    // Verify success banner appears
    await expect(page.getByText(/Dry-run completed/i)).toBeVisible();
  });
});
