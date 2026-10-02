import { test, expect } from '@playwright/test';

// Content checks only. The platform lane covers the HTTP status of /gopilot.
test('gopilot replay: flags build the command and the stepper reaches the diff', async ({ page }) => {
  await page.goto('/gopilot');

  await expect(page.getByRole('heading', { level: 1, name: /goPilot/ })).toBeVisible();
  await expect(page.getByRole('note')).toContainText(/illustrative/i);

  await page.getByRole('button', { name: 'All defaults' }).click();
  await page.getByLabel(/Run tests/).check();
  await expect(page.locator('.gp-cmdbox')).toHaveText('./localtest/run.sh -t true');

  await page.getByRole('button', { name: 'Run all steps' }).click();
  await expect(page.getByRole('log')).toContainText('--- FAIL: TestAverageEmpty');
  await expect(page.getByRole('log')).toContainText('thread_DEMO_test');
  await expect(page.getByText(/not model output/)).toBeVisible();
  await expect(page.getByLabel('Diff of the suggested fix')).toContainText('return 0');
});
