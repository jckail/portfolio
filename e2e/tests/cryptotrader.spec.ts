import { test, expect } from './fixtures';

test('crypto trader demo: disclaimers, controls and backtest output', async ({ page }) => {
  await page.goto('/cryptotrader');
  await expect(page.getByRole('heading', { level: 1, name: 'Algo Crypto' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('not financial advice');
  await expect(page.getByRole('img')).toHaveCount(3);

  const returns = page.locator('dt:text("Strategy return") + dd');
  const before = await returns.textContent();
  await page.getByLabel('Random seed').fill('777');
  await page.getByLabel('Rule').selectOption('momentum');
  await expect(page.getByLabel(/Lookback/)).toBeVisible();
  await expect(returns).not.toHaveText('');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(returns).toHaveText(before ?? '');

  await page.getByText('Data table').click();
  await expect(page.getByRole('table', { name: /sampled every 21 trading days/ })).toBeVisible();
});
