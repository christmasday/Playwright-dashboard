import { test, expect } from './fixtures';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from './helpers/constants';

test.describe('Auth UI', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'wrong@pw.local');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', SEED_ADMIN_EMAIL);
    await page.fill('input[type="password"]', SEED_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('logout returns to login', async ({ authedPage }) => {
    await authedPage.click('div[aria-label="User Profile"]');
    await authedPage.click('button[aria-label="Logout"]');
    await authedPage.waitForURL('**/login');
    await expect(authedPage).toHaveURL(/.*\/login/);
  });
});
