import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Alerts & Integrations UI', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate with credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Alerts
    await page.goto('/alerts');
    await page.waitForURL('**/alerts');
  });

  test('renders alerts dashboard with platform cards and toolbar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Alerts & Integrations/i })).toBeVisible();

    // Check platform cards exist
    await expect(page.getByRole('heading', { name: 'Slack' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Microsoft Teams' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discord' })).toBeVisible();

    // Check Action buttons exist
    await expect(page.getByRole('button', { name: /Delivery Logs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Integration/i })).toBeVisible();
  });

  test('opens alert modal and allows configuring Slack webhook with test payload', async ({ page }) => {
    // Intercept test alert endpoint
    await page.route('**/api/alerts/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Test notification successfully delivered to SLACK',
          statusCode: 200,
          latencyMs: 85,
        }),
      });
    });

    // Intercept create alert endpoint
    await page.route('**/api/alerts', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'test-dest-id-123',
              name: postData.name,
              provider: postData.provider,
              webhook_url: postData.webhookUrl,
              events: postData.events || 'failures_only',
              branches: postData.branches || '*',
              include_ai_summary: postData.includeAiSummary ?? true,
              enabled: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Open modal
    await page.getByRole('button', { name: /Add Integration/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: /Configure Alert Channel|Edit Alert Destination/i })).toBeVisible();

    // Select Discord tab to verify tab switcher
    await modal.getByRole('button', { name: /Discord/i }).click();
    // Re-select Slack
    await modal.getByRole('button', { name: /Slack/i }).click();

    // Fill channel name
    await modal.locator('input[placeholder*="#qa-ci-builds"]').fill('#ci-cd-alerts');

    // Fill webhook URL
    await modal.locator('input[placeholder*="hooks.slack.com"]').fill('https://hooks.slack.com/services/T00/B00/X00');

    // Click "Send Test Notification"
    await modal.getByRole('button', { name: /Send Test Notification/i }).click();
    await expect(modal.getByText(/Test notification successfully delivered/i)).toBeVisible({ timeout: 10_000 });

    // Save integration
    await modal.getByRole('button', { name: /Save Integration/i }).click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();
  });

  test('opens delivery logs drawer', async ({ page }) => {
    // Intercept logs endpoint
    await page.route('**/api/alerts/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          data: [
            {
              id: 'log-1',
              destination_name: '#ci-cd-alerts',
              provider: 'slack',
              status: 'success',
              status_code: 200,
              latency_ms: 64,
              build_name: 'Regression Suite #42',
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.getByRole('button', { name: /Delivery Logs/i }).click();
    await expect(page.getByRole('heading', { name: 'Delivery Audit Logs' })).toBeVisible();
    await expect(page.getByText('#ci-cd-alerts')).toBeVisible();
    await expect(page.getByText(/HTTP 200/i)).toBeVisible();

    // Close drawer
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Delivery Audit Logs' })).not.toBeVisible();
  });
});
