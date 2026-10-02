import { test, expect } from './fixtures';

test('jobbr lab parses postings, scores a sample resume and explains a match', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/jobbr');
  await expect(page.getByRole('heading', { level: 1, name: /Jobbr/ })).toBeVisible();
  await expect(page.getByText('Synthetic demo.')).toBeVisible();
  await expect(page.getByText('8 of 8 postings shown')).toBeVisible();

  await page.getByRole('button', { name: 'Use sample resume' }).click();
  await expect(page.getByText(/Match score: \d+ \/ 100/).first()).toBeVisible();

  await page.getByRole('button', { name: /^Show details/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Why this score' })).toBeVisible();
  await expect(page.getByText(/Missing skills:/)).toBeVisible();

  await page.getByLabel('Search').fill('zzz-no-such-posting');
  await expect(page.getByText('0 of 8 postings shown')).toBeVisible();
  expect(errors).toEqual([]);
});

test('jobbr lab has no horizontal overflow at 390px and makes no API calls', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', r => {
    if (new URL(r.url()).pathname.startsWith('/api/') && !r.url().includes('/api/labs')) calls.push(r.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jobbr');
  await page.getByRole('button', { name: 'Use sample resume' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(calls.filter(u => /resume|jobbr\/parse|match/i.test(u))).toEqual([]);
});
