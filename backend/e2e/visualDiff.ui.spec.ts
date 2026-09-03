import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

// Sample 1x1 transparent PNG data URI for deterministic visual diff testing
const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Visual Regression Diff Viewer UI', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate with user credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('detects visual regression snapshots and renders Visual Diffs tab and viewer', async ({ page }) => {
    // Intercept test details API call to inject visual regression artifacts (expected, actual, diff)
    await page.route('**/api/tests/details/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          testRun: {
            id: 'mock-visual-test-id',
            name: 'visual-regression-header.spec.ts',
            title: 'should match visual snapshot of navigation header',
            file: 'specs/visual-regression-header.spec.ts',
            status: 'failed',
            duration: 1240,
            retries: 0,
            error: 'Snapshot comparison failed: 1.4% pixel mismatch',
          },
          steps: [
            {
              id: 'step-1',
              title: 'expect(header).toHaveScreenshot()',
              status: 'failed',
              error: 'Screenshot does not match golden baseline',
            },
          ],
          artifacts: [
            {
              id: 'art-expected',
              name: 'nav-header-expected.png',
              type: 'screenshot',
              url: SAMPLE_PNG,
              size: 4096,
            },
            {
              id: 'art-actual',
              name: 'nav-header-actual.png',
              type: 'screenshot',
              url: SAMPLE_PNG,
              size: 4120,
            },
            {
              id: 'art-diff',
              name: 'nav-header-diff.png',
              type: 'screenshot',
              url: SAMPLE_PNG,
              size: 512,
            },
          ],
          siblingTests: [],
        }),
      });
    });

    // Navigate to the test details page
    await page.goto('/tests/mock-visual-test-id');

    // Verify the "Visual Diff" header action button and "Visual Diffs" tab appear
    const visualDiffButton = page.getByRole('button', { name: /Visual Diff \(\d+\)/i });
    await expect(visualDiffButton).toBeVisible();

    const visualDiffTab = page.getByRole('button', { name: /Visual Diffs \(\d+\)/i });
    await expect(visualDiffTab).toBeVisible();

    // Click to activate Visual Diffs tab
    await visualDiffTab.click();

    // Verify 4 Inspection Modes exist in the viewer
    await expect(page.getByRole('button', { name: /Split Slider/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /2-Up/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Onion Skin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Diff Map/i })).toBeVisible();

    // 1. Verify Split Slider Mode controls
    await expect(page.getByText('Split Position:')).toBeVisible();
    const sliderRange = page.locator('input[type="range"]');
    await expect(sliderRange).toBeVisible();

    // 2. Switch to Side-by-Side (2-Up) Mode
    await page.getByRole('button', { name: /2-Up/i }).click();
    await expect(page.getByText(/Expected \(Golden Baseline\)/i)).toBeVisible();
    await expect(page.getByText(/Actual \(Current Run\)/i)).toBeVisible();

    // 3. Switch to Onion Skin Mode
    await page.getByRole('button', { name: /Onion Skin/i }).click();
    await expect(page.getByText(/Opacity Cross-Fade:/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Flash Flip/i })).toBeVisible();

    // 4. Switch to Diff Map Mode and test color selectors
    await page.getByRole('button', { name: /Diff Map/i }).click();
    await expect(page.getByRole('button', { name: /MAGENTA/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GREEN/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /AMBER/i })).toBeVisible();

    // Click Green highlight color
    await page.getByRole('button', { name: /GREEN/i }).click();

    // 5. Test Zoom Controls
    await expect(page.getByTitle('Zoom In (+)')).toBeVisible();
    await page.getByTitle('Zoom In (+)').click();
    await expect(page.getByText('125%')).toBeVisible();

    await page.getByTitle('Reset Zoom (Press 0)').click();
    await expect(page.getByText('100%')).toBeVisible();
  });
});
