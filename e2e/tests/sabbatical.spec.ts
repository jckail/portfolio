import { expect, test } from '@playwright/test';

test('the sabbatical entry sits between Prove and Meta and opens by deep link', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#experience li.timeline-item h3');
  await items.first().waitFor();
  const companies = await items.allTextContents();
  const i = companies.findIndex(name => name.includes('Sabbatical'));
  expect(i).toBeGreaterThan(0);
  expect(companies[i - 1]).toContain('Prove');
  expect(companies[i + 1]).toContain('Meta');

  await page.goto('/?company=sabbatical');
  const dialog = page.getByRole('dialog', { name: 'Sabbatical' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('digital nomad life with my wife').first()).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveCount(0);
});
