import { test as base, expect, type Page } from '@playwright/test';

export const CONSENT_KEY = 'portfolio_cookie_consent';

/** Stub every first-party telemetry sink so tests never depend on (or write to) real services. */
async function stubTelemetry(page: Page) {
  await page.route('**/api/telemetry', r => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/events', r => r.fulfill({ status: 204, body: '' }));
}

/** Optional legacy state only for regression checks; fresh visits by default. */
export const test = base.extend<{ consent: 'denied' | 'accepted' | null }>({
  consent: [null, { option: true }],
  page: async ({ page, consent }, use) => {
    // Never reach Google, whatever a test does.
    await page.route('https://www.googletagmanager.com/**', r => r.abort());
    await page.route('https://www.google-analytics.com/**', r => r.abort());
    await stubTelemetry(page);
    if (consent) {
      await page.addInitScript(
        ([k, v]) => {
          try {
            if (!sessionStorage.getItem('__e2e_seeded')) {
              localStorage.setItem(k, v);
              sessionStorage.setItem('__e2e_seeded', '1');
            }
          } catch {
            /* ignore */
          }
        },
        [CONSENT_KEY, consent],
      );
    }
    await use(page);
  },
});

export { expect };
