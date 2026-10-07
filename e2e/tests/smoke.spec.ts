import { test, expect } from '@playwright/test';

test('page loads, all sections render, and assistant entry opens', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Jordan Kail/);

  for (const id of ['about', 'experience', 'projects', 'skills']) {
    await expect(page.locator(`section#${id}`)).toBeAttached();
  }

  await page.getByRole('link', { name: 'Chat with AI', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Meet Jordan’s assistant/ })
  ).toBeVisible();
});
