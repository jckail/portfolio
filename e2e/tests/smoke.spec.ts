import { test, expect } from '@playwright/test';

test('page loads, all sections render, and chat opens', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Jordan Kail/);

  for (const id of ['about', 'experience', 'projects', 'skills']) {
    await expect(page.locator(`section#${id}`)).toBeAttached();
  }

  await page.getByRole('button', { name: 'Chat with AI' }).click();
  await expect(
    page.getByRole('heading', { name: /Jordan's AI Assistant/ })
  ).toBeVisible();
});
