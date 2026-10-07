import { test, expect } from './fixtures';

// Content checks only. Whether a given hosted slug answers 200 depends on which
// labs are in the build, so that is covered by the backend tests.

// APIRequestContext ignores the browser's host-resolver rule that
// helpers/e2e-docker.sh sets, so address the server the way the container can.
const origin = (process.env.E2E_BASE_URL || 'http://localhost:18080').replace(
  'localhost',
  process.env.E2E_HOST_MAP || 'localhost'
);

test.describe('forwards', () => {
  for (const [slug, target] of [
    ['superteacher', 'https://www.the-super-teacher.com/'],
    ['pointup', 'https://www.pointup.io/'],
    ['jobbr', 'https://jobdog.ai/jobbr/'],
  ] as const) {
    test(`/${slug} forwards to its own domain`, async ({ request }) => {
      for (const path of [`/${slug}`, `/${slug}/`]) {
        const response = await request.get(origin + path, { maxRedirects: 0 });
        expect(response.status()).toBe(302);
        expect(response.headers()['location']).toBe(target);
        expect(response.headers()['x-robots-tag']).toContain('noindex');
      }
    });
  }

  test('forwards are not in the sitemap but are listed in llms.txt', async ({ request }) => {
    const sitemap = await (await request.get(`${origin}/sitemap.xml`)).text();
    expect(sitemap).not.toContain('pointup');
    expect(sitemap).not.toContain('superteacher');
    expect(sitemap).not.toContain('jobbr');
    const llms = await (await request.get(`${origin}/llms.txt`)).text();
    expect(llms).toContain('## Interactive demos');
    expect(llms).toContain('https://www.pointup.io/');
    expect(llms).toContain('https://jobdog.ai/jobbr/');
  });
});

test('an unknown lab slug shows the Not Found view', async ({ page }) => {
  await page.goto('/nosuchdemo');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the portfolio' })).toHaveAttribute('href', '/');
});


for (const slug of ['aibilling', 'gopilot', 'cryptotrader']) {
  test(`${slug} lab does not overflow horizontally at phone width`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'page must not scroll sideways').toBeLessThanOrEqual(0);
  });
}

for (const slug of ['aibilling', 'gopilot', 'cryptotrader']) {
  test(`${slug} lab has exactly one main landmark and one h1`, async ({ page }) => {
    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}
