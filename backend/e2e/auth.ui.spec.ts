import { test, expect } from './fixtures';
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Auth UI', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('rejects invalid credentials with error notification', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'wrong@pw.local');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('logs in with user credentials (ojbauer24@gmail.com)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirection to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verify token stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // Verify user profile pill or dropdown in sidebar/navbar
    const userProfile = page.locator('div[aria-label="User Profile"]');
    await expect(userProfile).toBeVisible();
  });

  test('logs in with seed admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', SEED_ADMIN_EMAIL);
    await page.fill('input[type="password"]', SEED_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('logout clears session and returns to login', async ({ authedPage }) => {
    await authedPage.click('div[aria-label="User Profile"]');
    await authedPage.click('button[aria-label="Logout"]');
    await authedPage.waitForURL('**/login');
    await expect(authedPage).toHaveURL(/.*\/login/);

    const token = await authedPage.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });
});
