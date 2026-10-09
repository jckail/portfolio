import { test, expect } from './fixtures';

for (const width of [390, 1440]) {
  test(`writing page themes, discovery, and draft privacy at ${width}px`, async ({ page, request }) => {
    const failures: string[] = [];
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/blog?theme=dark');
    await expect(page.getByRole('heading', { name: 'Writing', exact: true })).toBeVisible();
    await expect(page.getByText('No posts published yet.', { exact: false })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page).toHaveURL(/theme=light/);
    await expect(page.getByRole('link', { name: 'Follow via RSS', exact: false })).toHaveAttribute('href', '/blog/feed.xml');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(failures).toEqual([]);
    const feed = await request.get('/blog/feed.xml');
    expect(feed.status()).toBe(200);
    expect(await feed.text()).toContain('<rss');
    const draft = await request.get('/blog/first-post');
    expect(draft.status()).toBe(404);
    await page.getByRole('link', { name: 'Explore projects', exact: false }).click();
    await expect(page.getByRole('tab', { name: 'Featured', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    const writing = page.getByRole('link', { name: 'Writing', exact: true }).filter({ visible: true });
    await writing.first().click();
    await expect(page).toHaveURL(/\/blog/);
  });
}
