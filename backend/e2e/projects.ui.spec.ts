import { test, expect } from './fixtures';
import { randomSuffix } from './helpers/api';

test.describe('Projects UI', () => {
  test('create a project and view its builds', async ({ authedPage }) => {
    const name = `e2e-${randomSuffix()}`;
    await authedPage.goto('/projects');
    await authedPage.getByRole('button', { name: 'New Project' }).click();
    await authedPage.fill('input[placeholder="Project name"]', name);
    await authedPage.fill('textarea[placeholder="Description (optional)"]', 'created by e2e');
    await authedPage.getByRole('button', { name: 'Create Project' }).click();

    const card = authedPage.locator('div', { hasText: name }).first();
    await expect(card.getByText(name)).toBeVisible();

    await card.locator('a[href*="/projects/"]').click();
    await authedPage.waitForURL('**/projects/**/builds');
    await expect(authedPage).toHaveURL(/\/projects\/.*\/builds/);
  });
});
