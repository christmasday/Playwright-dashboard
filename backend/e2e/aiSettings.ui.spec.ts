import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('AI Provider & BYOK Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login with user credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('/profile');
  });

  test('renders AI Provider & BYOK configuration panel', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /BYOK/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Select Preferred AI Provider')).toBeVisible();

    // Verify key supported providers are visible
    await expect(page.getByText('Google Gemini')).toBeVisible();
    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Anthropic Claude')).toBeVisible();
    await expect(page.getByText('Built-in Offline Heuristics')).toBeVisible();
  });

  test('allows selecting different AI providers and shows API key input', async ({ page }) => {
    // Click OpenAI provider
    await page.getByRole('button', { name: /OpenAI/i }).first().click();

    // Verify API key input appears
    const apiKeyInput = page.locator('input[placeholder*="API key"]');
    await expect(apiKeyInput).toBeVisible();

    // Type a dummy API key
    await apiKeyInput.fill('sk-test-mock-key-12345');

    // Test Show/Hide password toggle
    const toggleButton = page.getByRole('button', { name: /Show|Hide/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');
    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('switches back to Built-in Heuristics without requiring API key', async ({ page }) => {
    // Select Built-in Heuristics
    await page.getByRole('button', { name: /Built-in Offline Heuristics/i }).click();

    // Notice should explain no API key is required
    await expect(page.getByText(/Deterministic Playwright rule engine/i)).toBeVisible();

    // Save AI Settings
    const saveButton = page.getByRole('button', { name: /Save AI Settings/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify success confirmation banner
    await expect(page.getByText(/AI Provider & BYOK settings saved successfully/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
