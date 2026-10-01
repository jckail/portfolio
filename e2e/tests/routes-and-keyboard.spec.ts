import { test, expect } from './fixtures';

test.describe('routing', () => {
  test('unknown path serves a 404 document with the on-brand view and a way home', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
    await page.getByRole('link', { name: 'Back to the portfolio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('section#about')).toBeAttached();
  });

  test('/admin opens the login dialog', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);
    const dialog = page.getByRole('dialog', { name: 'Admin Login' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

test.describe('keyboard', () => {
  test('skip link is the first tab stop and targets main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main-content');
  });

  test('Ctrl+K opens the command palette and Escape closes it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('section#about')).toBeAttached();
    await page.keyboard.press('Control+k');
    const search = page.getByRole('combobox', { name: 'Search commands' }).or(
      page.getByLabel('Search commands'),
    );
    await expect(search.first()).toBeVisible();
    await expect(search.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(search.first()).toBeHidden();
  });
});

test.describe('hostile deep links do not crash the app', () => {
  for (const query of ['?skill=__proto__', '?skill=constructor', '?project=constructor', '?project=__proto__', '?company=constructor']) {
    test(query, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`/${query}`);
      for (const id of ['about', 'experience', 'projects', 'skills']) {
        await expect(page.locator(`section#${id}`)).toBeAttached();
      }
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});
