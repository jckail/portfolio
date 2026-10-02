import { test, expect } from './fixtures';

// Content-only check. Needs the lab host (platform lane); does not assert the HTTP status.
test('aibilling demo: synthetic notice, pipeline and invoice work', async ({ page }) => {
  await page.goto('/aibilling');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI Chat Billing');
  await expect(page.getByRole('note')).toContainText('synthetic');

  await page.getByRole('button', { name: 'Send a message event' }).click();
  await expect(page.getByText('1 waiting for the next batch')).toBeVisible();

  await page.getByLabel('Scenario').selectOption('runaway');
  await page.getByRole('checkbox').first().check();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
});
