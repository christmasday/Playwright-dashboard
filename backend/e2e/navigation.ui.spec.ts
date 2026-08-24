import { test, expect } from './fixtures';

test.describe('Navigation UI', () => {
  test('sidebar links navigate', async ({ authedPage }) => {
    await authedPage.goto('/dashboard');

    await expect(authedPage.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(authedPage.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(authedPage.getByRole('link', { name: 'Builds' })).toBeVisible();
    await expect(authedPage.getByRole('link', { name: 'Flaky Tests' })).toBeVisible();

    await authedPage.getByRole('link', { name: 'Projects' }).click();
    await authedPage.waitForURL('**/projects');
    await expect(authedPage).toHaveURL(/.*\/projects/);
  });
});
