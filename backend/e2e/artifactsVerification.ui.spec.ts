import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('Test Run Artifacts Verification', () => {
  test('renders screenshot and video player with active media', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to the test details artifacts tab
    await page.goto('/tests/6b216f29-f29b-434a-8b6d-5cd84fdb13f5?tab=artifacts');
    await page.waitForLoadState('networkidle');

    // 3. Verify Test Screenshots section
    await expect(page.getByText('Test Screenshots')).toBeVisible();
    const screenshotImg = page.locator('img[alt="screenshot"]');
    await expect(screenshotImg).toBeVisible();

    // Verify image has loaded (naturalWidth > 0)
    const naturalWidth = await screenshotImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // 4. Verify Test Execution Video Recordings section
    await expect(page.getByText('Test Execution Video Recordings')).toBeVisible();
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Scroll video into view
    await video.scrollIntoViewIfNeeded();

    // Wait for video metadata to load
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && v.readyState >= 1;
    });

    const duration = await video.evaluate((v: HTMLVideoElement) => v.duration);
    expect(duration).toBeGreaterThan(0);

    // Take screenshot of the video section
    await page.screenshot({
      path: '/Users/Fabian/.gemini/antigravity-ide/brain/780bf668-7fc4-4de3-a02e-dd1417b2de03/verified_video_screen.png',
    });
  });

  test('opens Trace Inspector modal without broken relative URL errors', async ({ page }) => {
    // 1. Authenticate
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to test details artifacts tab
    await page.goto('/tests/6b216f29-f29b-434a-8b6d-5cd84fdb13f5?tab=artifacts');
    await page.waitForLoadState('networkidle');

    // 3. Click "Inspect In Dashboard" button on the trace card
    const inspectBtn = page.getByRole('button', { name: /Inspect In Dashboard/i }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // 4. Verify Trace Inspector modal appears
    await expect(page.getByText('Playwright Trace Inspector')).toBeVisible();

    // Verify iframe source is the clean trace viewer (not appending broken relative path)
    const iframe = page.locator('iframe[title="Playwright Trace Viewer"]');
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBe('https://trace.playwright.dev/');

    // Wait for modal and capture screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/Users/Fabian/.gemini/antigravity-ide/brain/780bf668-7fc4-4de3-a02e-dd1417b2de03/verified_trace_modal.png',
    });

    // 5. Close modal with ESC
    await page.keyboard.press('Escape');
    await expect(page.getByText('Playwright Trace Inspector')).not.toBeVisible();
  });
});
