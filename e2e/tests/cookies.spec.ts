import { test, expect, CONSENT_KEY } from './fixtures';


test.describe('cookie banner', () => {
  test.use({ consent: null });

  test('Deny stores denied and never requests analytics', async ({ page }) => {
    const gaRequests: string[] = [];
    page.on('request', r => {
      if (r.url().includes('googletagmanager.com')) gaRequests.push(r.url());
    });
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Cookie consent' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: /deny/i }).click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(k => localStorage.getItem(k), CONSENT_KEY)).toBe('denied');
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
    expect(gaRequests).toEqual([]);
  });

  test('Accept requests gtag, and the footer link reopens the banner', async ({ page }) => {
    const attempted = page.waitForRequest(r => r.url().includes('googletagmanager.com/gtag/js'));
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Cookie consent' });
    await banner.getByRole('button', { name: /accept/i }).click();
    await attempted; // the route in fixtures aborts it; we only assert it was attempted
    expect(await page.evaluate(k => localStorage.getItem(k), CONSENT_KEY)).toBe('accepted');
    await expect(banner).toBeHidden();

    await page.getByText('Cookie settings').click();
    await expect(banner).toBeVisible();
  });
});

test('Cookie settings reopens the banner after a prior Deny', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
  await page.getByText('Cookie settings').click();
  await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
});
