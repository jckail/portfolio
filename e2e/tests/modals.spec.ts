import { test, expect } from './fixtures';

test.describe('skill modal', () => {
  test('?skill=python shows usage, pages with prev/next, closes on Escape and cleans the URL', async ({ page }) => {
    await page.goto('/?skill=python');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2, name: 'Python' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Where I.ve used it/ })).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Roles' })).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Projects' })).toBeVisible();

    const pager = dialog.getByRole('navigation', { name: /More in/ });
    const position = pager.locator('.skm-position');
    const before = await position.innerText();
    await pager.locator('.skm-step-next').click();
    await expect.poll(() => page.url()).not.toContain('skill=python');
    await expect.poll(() => page.url()).toContain('skill=');
    await expect(position).not.toHaveText(before);
    await pager.locator('.skm-step').first().click();
    await expect.poll(() => page.url()).toContain('skill=');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(page.url()).not.toContain('skill=');
  });
});

test.describe('experience modal', () => {
  test('a skill tag swaps to the skill dialog (one at a time) and focus returns on close', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByText('View Together AI experience details').locator('..');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const expDialog = page.getByRole('dialog');
    await expect(expDialog).toHaveCount(1);
    await expect(expDialog).toContainText('Together AI');

    await expDialog.locator('.skill-tag', { hasText: /^Python$/ }).first().click();
    const skillDialog = page.getByRole('dialog');
    await expect(skillDialog).toHaveCount(1);
    await expect(skillDialog.getByRole('heading', { level: 2, name: 'Python' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    // Focus is back inside the page content, not stranded on <body>.
    await expect.poll(() => page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  });
});

test.describe('contact dialog and phone reveal', () => {
  test('email and company are required before delivery reveals a phone', async ({ page }) => {
    let calls = 0;
    let body = '';
    await page.route('**/api/contact/draft', route => route.fulfill({ json: { message: 'Hi Jordan, can we connect?' } }));
    await page.route('**/api/contact/send-email', async route => {
      calls += 1;
      body = route.request().postData() ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"phone":"+1 (555) 010-0100"}' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'View Contact' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText(/Recommended by my AI agent/)).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Send message & connect' });

    // Required: the browser blocks an empty submit, so nothing is sent.
    await submit.click();
    expect(calls).toBe(0);
    expect(await dialog.getByLabel('Your email', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);

    await dialog.getByLabel('Your email', { exact: true }).fill('visitor@example.com');
    await submit.click();
    expect(calls).toBe(0);
    expect(await dialog.getByLabel('Company or organization').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
    await expect(dialog.locator('a[href^="tel:"]')).toHaveCount(0);
    await dialog.getByLabel('Company or organization').fill('Example Labs');
    await submit.click();
    const link = dialog.getByRole('link', { name: '+1 (555) 010-0100' });
    await expect(link).toHaveAttribute('href', 'tel:+15550100100');
    expect(JSON.parse(body)).toEqual({ from_email: 'visitor@example.com', company: 'Example Labs',
      subject: 'Connecting via your portfolio', message: 'Hi Jordan, can we connect?\n\nMy email: visitor@example.com\nCompany: Example Labs' });
  });
});
