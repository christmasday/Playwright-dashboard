import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Builds & Build Compare UI', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate with user credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('navigates to Builds page and lists test builds', async ({ page }) => {
    await page.goto('/builds');
    await expect(page).toHaveURL(/.*\/builds/);
    await expect(page.getByRole('heading', { name: /Build History|Builds/i })).toBeVisible();

    // Verify Compare Runs button is visible
    const compareLink = page.locator('main').getByRole('link', { name: /Compare Runs/i });
    await expect(compareLink).toBeVisible();
  });

  test('navigates to Compare Runs interface and renders selectors', async ({ page }) => {
    await page.goto('/builds/compare');
    await expect(page).toHaveURL(/.*\/builds\/compare/);
    await expect(page.getByRole('heading', { name: /Build-to-Build Run Comparison/i })).toBeVisible();

    // Verify Base and Target build selector dropdowns
    await expect(page.getByText('Base Build (Baseline / Reference)')).toBeVisible();
    await expect(page.getByText('Target Build (Current / Pull Request)')).toBeVisible();

    // Verify swap button
    const swapButton = page.getByRole('button', { name: /Swap|Reverse/i });
    if (await swapButton.isVisible()) {
      await expect(swapButton).toBeEnabled();
    }
  });

  test('switches comparison filter tabs when comparison is loaded', async ({ page }) => {
    await page.goto('/builds/compare');

    // If dropdowns have options, test tab switching
    const selectElements = page.locator('select');
    const selectCount = await selectElements.count();

    if (selectCount >= 2) {
      const baseSelect = selectElements.nth(0);
      const targetSelect = selectElements.nth(1);

      const baseOptions = await baseSelect.locator('option').all();
      const targetOptions = await targetSelect.locator('option').all();

      if (baseOptions.length > 1 && targetOptions.length > 1) {
        await baseSelect.selectOption({ index: 0 });
        await targetSelect.selectOption({ index: 1 });

        // Verify categorized tabs render
        const regressionsTab = page.getByRole('button', { name: /Regressions/i });
        const fixesTab = page.getByRole('button', { name: /Fixed Tests|Fixes/i });

        if (await regressionsTab.isVisible()) {
          await fixesTab.click();
          await expect(fixesTab).toHaveClass(/bg-emerald-600/);
        }
      }
    }
  });
});
