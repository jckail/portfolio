import type { Page } from '@playwright/test';

import { test, expect, CONSENT_KEY } from './fixtures';

function watchAnalytics(page: Page) {
  const gaRequests: string[] = [];
  const eventRequests: string[] = [];
  page.on('request', r => {
    if (r.url().includes('googletagmanager.com') || r.url().includes('google-analytics.com')) {
      gaRequests.push(r.url());
    }
    if (r.url().includes('/api/events')) eventRequests.push(r.url());
  });
  return { gaRequests, eventRequests };
}

test.describe('analytics stay off without a stored choice', () => {
  test.use({ consent: null });

  test('shows no banner and requests no analytics', async ({ page }) => {
    const seen = watchAnalytics(page);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cookie settings' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Scroll to top' })).toBeVisible();
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
    expect(seen.gaRequests).toEqual([]);
    expect(seen.eventRequests).toEqual([]);
  });
});

test.describe('analytics stay off after a prior accept', () => {
  test.use({ consent: 'accepted' });

  test('does not reload Google Analytics or the first-party event stream', async ({ page }) => {
    const seen = watchAnalytics(page);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cookie settings' })).toHaveCount(0);
    expect(await page.evaluate(k => localStorage.getItem(k), CONSENT_KEY)).toBe('accepted');
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
    expect(seen.gaRequests).toEqual([]);
    expect(seen.eventRequests).toEqual([]);
  });
});
