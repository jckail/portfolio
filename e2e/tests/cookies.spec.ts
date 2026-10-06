import { readFileSync } from 'node:fs';

import { test, expect } from './fixtures';

const states = [null, 'accepted', 'denied', 'malformed', 'inaccessible'] as const;
for (const state of states) {
  for (const path of ['/', '/dataplayground']) {
    test(`no consent UI or visitor analytics: ${path} with ${state}`, async ({ page }) => {
      const analytics: string[] = [];
      page.on('request', request => {
        if (/googletagmanager|google-analytics|\/api\/events(?:[?]|$)|ga-init/.test(request.url())) analytics.push(request.url());
      });
      await page.addInitScript(saved => {
        localStorage.setItem('portfolio-theme-preference', 'dark');
        sessionStorage.setItem('chat_session_id', 'chat_existing_fixture');
        if (saved === 'inaccessible') {
          Storage.prototype.getItem = function(key) {
            if (key === 'portfolio_cookie_consent') throw new Error('storage blocked');
            return null;
          };
        } else if (saved) localStorage.setItem('portfolio_cookie_consent', saved);
      }, state);
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      await expect(page.getByRole('region', { name: 'Cookie consent' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cookie settings' })).toHaveCount(0);
      await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
      if (path === '/') {
        await page.getByRole('button', { name: 'Switch to light mode' }).click();
        await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toHaveCount(1);
        await page.goto('/?company=sabbatical');
        const dialog = page.getByRole('dialog', { name: 'Sabbatical' });
        await expect(dialog).toBeVisible();
        for (const text of [
          'Digital nomad experiment',
          'Made up for lost time during COVID-19 by exploring the world, chasing outdoor adventures, and spending time with family.',
          'Seattle, Portland, San Francisco, Austin, New York, Washington, DC, Chicago, Los Angeles, and San Diego.',
          'Spent 50 nights camping and hiking, and skied 100 days that season in Colorado and Utah.',
          'Traveled through Europe, spent time with family members in need, and relocated back to Denver from California.',
          '10/2022 - 05/2023',
        ]) await expect(dialog).toContainText(text);
        await expect(dialog).not.toContainText('Meta');
        await expect(dialog).not.toContainText('Prove');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await page.goBack();
        await page.goForward();
        await page.keyboard.press('Escape');
        const response = await page.request.get('/api/resume?download=true');
        expect(response.ok()).toBe(true);
        expect(await response.body()).toEqual(readFileSync('../backend/assets/JordanKailResume.pdf'));
      }
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) window.dispatchEvent(new CustomEvent('portfolio:track', { detail: { event: 'chat_open' } }));
        window.dispatchEvent(new Event('portfolio:consent-changed'));
        window.dispatchEvent(new Event('pagehide'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(3200);
      expect(analytics).toEqual([]);
      expect(await page.evaluate(() => sessionStorage.getItem('ga_session_id'))).toBeNull();
    });
  }
}

test('cached HTML can request the retired GA stub without enabling analytics', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => { if (/googletagmanager|google-analytics|\/api\/events/.test(r.url())) requests.push(r.url()); });
  await page.addInitScript(() => localStorage.setItem('portfolio_cookie_consent', 'accepted'));
  await page.goto('/');
  await page.addScriptTag({ url: '/ga-init.js' });
  expect(await page.evaluate(() => typeof window.loadGoogleAnalytics)).toBe('undefined');
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined');
  expect(requests).toEqual([]);
});
