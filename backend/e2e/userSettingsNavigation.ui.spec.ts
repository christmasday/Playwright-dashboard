import { test, expect } from './fixtures';
import { USER_EMAIL, USER_PASSWORD } from './helpers/constants';

test.describe('User Settings Navigation & Profile Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate with credentials
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('ensures Integrations and Storage are not in sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Verify main nav links exist
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Analytics' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Projects' })).toBeVisible();

    // Verify Integrations, Storage, and API Keys links are NOT in sidebar nav
    await expect(sidebar.getByRole('link', { name: 'Integrations' })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Storage' })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'API Keys' })).not.toBeVisible();
  });

  test('opens user profile dropdown and accesses Settings page located under Profile Settings', async ({ page }) => {
    const sidebar = page.locator('aside');

    // Find and click the user profile section in sidebar
    const profileCard = sidebar.getByLabel('User Profile');
    await expect(profileCard).toBeVisible();
    await profileCard.click();

    // Verify dropdown menu opens
    const profileSettingsBtn = sidebar.getByRole('button', { name: 'Profile Settings', exact: true });
    const settingsBtn = sidebar.getByRole('button', { name: 'Settings', exact: true });

    await expect(profileSettingsBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();

    // Click Settings link in dropdown
    await settingsBtn.click();
    await page.waitForURL('**/settings**');

    // Verify User & System Settings page header
    await expect(page.getByRole('heading', { name: /User & System Settings/i })).toBeVisible();

    // Verify tabs are available
    const integrationsTab = page.locator('#tab-integrations');
    const storageTab = page.locator('#tab-storage');
    const aiTab = page.locator('#tab-ai');
    const notifTab = page.locator('#tab-notifications');
    const apiKeysTab = page.locator('#tab-api-keys');

    await expect(integrationsTab).toBeVisible();
    await expect(storageTab).toBeVisible();
    await expect(aiTab).toBeVisible();
    await expect(notifTab).toBeVisible();
    await expect(apiKeysTab).toBeVisible();
    // Profile & Account tab is removed from settings page
    await expect(page.locator('#tab-profile')).not.toBeVisible();

    // Integrations tab is active by default: shows GitHub and Jira settings
    await expect(page.getByRole('heading', { name: /Issue Tracker Integrations/i })).toBeVisible();
    await expect(page.getByText('GitHub Integration')).toBeVisible();

    // Switch to Storage tab
    await storageTab.click();
    await expect(page.getByRole('heading', { name: 'Storage', exact: true })).toBeVisible();
    await expect(page.getByText('Data retention and storage options.')).toBeVisible();
    await expect(page.getByText('Artifacts (Passed Tests)')).toBeVisible();

    // Switch to AI & BYOK tab
    await aiTab.click();
    await expect(page.getByRole('heading', { name: /AI Root Cause & BYOK Provider Configuration/i })).toBeVisible();
    await expect(page.getByText('Select Preferred AI Provider')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save AI Settings/i })).toBeVisible();

    // Switch to Notification Preferences tab
    await notifTab.click();
    await expect(page.getByRole('heading', { name: /In-App Notification Preferences/i })).toBeVisible();
    await expect(page.getByText('Email Notifications')).toBeVisible();
    await expect(page.getByText('Flaky Test Alerts')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Preferences/i })).toBeVisible();

    // Switch to API Keys tab
    await apiKeysTab.click();
    await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate new key/i })).toBeVisible();
    await expect(page.getByText('DASHBOARD_API_KEY')).toBeVisible();

    // Verify Profile Settings page is focused strictly on Personal Details & Password
    await page.goto('/settings/profile');
    await expect(page.getByText('Personal Details & Avatar')).toBeVisible();
    await expect(page.getByText('Security & Password')).toBeVisible();
    // Verify AI and Notification cards were removed from Profile page
    await expect(page.getByText('Select Preferred AI Provider')).not.toBeVisible();
  });
});
