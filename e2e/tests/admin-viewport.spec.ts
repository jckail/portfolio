import type { Locator } from '@playwright/test';

import { expect, test } from './fixtures';

test.use({ consent: null });

async function expectWithinViewport(locator: Locator, width: number, height: number) {
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    return box !== null && box.x >= 0 && box.y >= 0
      && box.x + box.width <= width && box.y + box.height <= height;
  }).toBe(true);
}

async function expectInsideScrollport(locator: Locator) {
  await expect.poll(() => locator.evaluate(element => {
    const modal = element.closest<HTMLElement>('[role="dialog"]');
    if (!modal) return false;
    const box = element.getBoundingClientRect();
    const frame = modal.getBoundingClientRect();
    const left = frame.left + modal.clientLeft;
    const top = frame.top + modal.clientTop;
    return box.left >= left && box.top >= top
      && box.right <= left + modal.clientWidth
      && box.bottom <= top + modal.clientHeight;
  })).toBe(true);
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [
    { width: 390, height: 240 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 },
  ]) {
    test(`admin controls remain keyboard reachable: ${theme} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?theme=${theme}#about`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.getByRole('button', { name: 'Deny All', exact: true }).click();
      // Exercise actual browser history before checking the modal: a fresh
      // load alone cannot catch viewport regressions after Back navigation.
      await page.goto(`/?theme=${theme}#projects`);
      await expect(page.locator('section#projects')).toBeAttached();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`\\?theme=${theme}#about$`));
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Capture a real keyboard-selected opener, not the disappearing consent
      // button or BODY, so restoration is a meaningful observable assertion.
      await page.keyboard.press('Tab');
      const priorActive = await page.evaluateHandle(() => document.activeElement);
      expect(await priorActive.evaluate(element => element !== null
        && element !== document.body && element.isConnected)).toBe(true);
      await page.keyboard.press('Control+Shift+A');

      const dialog = page.getByRole('dialog', { name: 'Admin Login', exact: true });
      await expect(dialog).toBeVisible();
      await expectWithinViewport(dialog, viewport.width, viewport.height);
      await expect(page.locator('.admin-login-overlay')).toHaveCSS('position', 'fixed');
      await expect.poll(() => page.locator('.admin-login-overlay').boundingBox())
        .toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');

      const email = dialog.getByLabel('Email', { exact: true });
      const password = dialog.getByLabel('Password', { exact: true });
      const submit = dialog.getByRole('button', { name: 'Login', exact: true });
      const close = dialog.getByRole('button', { name: 'Close', exact: true });
      // Real Tab navigation must scroll the focused control into view. Do not
      // use locator.focus/scrollIntoView to hide an inaccessible dialog.
      await expect(email).toBeFocused();
      await expectWithinViewport(email, viewport.width, viewport.height);
      await expectInsideScrollport(email);
      for (const control of [password, submit, close, email]) {
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await expectWithinViewport(control, viewport.width, viewport.height);
        await expectInsideScrollport(control);
      }
      await page.keyboard.press('Shift+Tab');
      await expect(close).toBeFocused();
      await expectWithinViewport(close, viewport.width, viewport.height);
      await expectInsideScrollport(close);
      await page.keyboard.press('Enter');
      await expect(dialog).not.toBeAttached();
      await expect.poll(() => priorActive.evaluate(element => element !== null
        && element.isConnected && element === document.activeElement)).toBe(true);

      await page.keyboard.press('Control+Shift+A');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeAttached();
      await expect.poll(() => priorActive.evaluate(element => element !== null
        && element.isConnected && element === document.activeElement)).toBe(true);
      await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
      await priorActive.dispose();
    });
  }
}
