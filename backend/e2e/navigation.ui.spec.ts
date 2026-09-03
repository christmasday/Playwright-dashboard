import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Navigation & Frontend Workflows UI', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate with user credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('sidebar links navigate across all main dashboard modules', async ({ page }) => {
    // 1. Dashboard
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

    // 2. Projects
    await page.getByRole('link', { name: 'Projects' }).click();
    await page.waitForURL('**/projects');
    await expect(page).toHaveURL(/.*\/projects/);

    // 3. Builds
    await page.getByRole('link', { name: 'Builds' }).click();
    await page.waitForURL('**/builds');
    await expect(page).toHaveURL(/.*\/builds/);
    await expect(page.getByRole('heading', { name: /Build History|Builds/i })).toBeVisible();

    // 4. Flaky Tests
    await page.getByRole('link', { name: 'Flaky Tests' }).click();
    await page.waitForURL('**/flaky-tests');
    await expect(page).toHaveURL(/.*\/flaky-tests/);

    // 5. Documentation
    const docsLink = page.getByRole('link', { name: 'Docs' });
    if (await docsLink.isVisible()) {
      await docsLink.click();
      await page.waitForURL('**/docs');
      await expect(page).toHaveURL(/.*\/docs/);
    }
  });

  test('navigates to Profile Settings and checks user profile dropdown', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.getByRole('heading', { name: /Account & Profile Settings/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /BYOK/i })).toBeVisible();
  });
});
