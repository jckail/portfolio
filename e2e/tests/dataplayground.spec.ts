import { test, expect } from '@playwright/test';

test('lab deep link explores generated scenarios, pipeline, events, and SQL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/dataplayground');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Data Playground | Jordan Kail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.jckail.com/dataplayground');
  await page.getByRole('button', { name: 'Data quality incident', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Data quality incident', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Validate schema/ }).click();
  await expect(page.locator('.lab-stage-detail h3')).toHaveText('Validate schema');
  await page.getByRole('combobox', { name: 'Event type', exact: true }).selectOption('payment');
  const types = page.locator('.lab-event-type');
  expect(await types.count()).toBeGreaterThan(0);
  for (const value of await types.allTextContents()) expect(value).toBe('payment');
  await page.getByLabel('Search events').fill('this-event-does-not-exist');
  await expect(page.getByText('No sampled events match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.lab-event-type').first()).toBeVisible();
  await page.locator('.lab-lineage summary').filter({ hasText: /^Summary$/ }).click();
  await expect(page.locator('.lab-lineage details').first().locator('code')).toContainText('SELECT');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Baseline', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('lab supports mobile, keyboard entry, and both themes without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/dataplayground/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Baseline', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to experiments' })).toBeFocused();
  await page.keyboard.press('Enter');
  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Use .* theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'light' : 'dark');
  await page.getByRole('button', { name: /Use .* theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'dark' : 'light');
  const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
});

test('every saved scenario has browser-valid custom parameters, including fractional churn', async ({ page }) => {
  await page.route('**/api/dataplayground', async route => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...await response.json(), live_simulation: true } });
  });
  await page.goto('/dataplayground');
  await page.getByText('Inspect parameters & run your own', { exact: true }).click();
  for (const name of ['Baseline', 'Acquisition surge', 'Stronger retention', 'Data quality incident']) {
    await page.getByRole('button', { name, exact: true }).click();
    expect(await page.locator('.lab-config form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);
  }
  await page.getByRole('button', { name: 'Stronger retention', exact: true }).click();
  await expect(page.getByLabel('Daily churn probability')).toHaveValue('0.005');
});

test('commerce dataset connects product filtering, graph traversal, and vector explanations', async ({ page }) => {
  await page.goto('/dataplayground');
  const exploration = page.getByRole('region', { name: 'One catalog. Two ways to explore.' });
  await expect(exploration).toBeVisible();
  await page.getByLabel('Search products', { exact: true }).fill('Travel tripod');
  const dataset = page.getByRole('region', { name: 'Synthetic product dataset', exact: true });
  await expect(dataset.locator('tbody tr')).toHaveCount(1);
  await dataset.getByRole('button', { name: 'Travel tripod', exact: true }).click();
  await expect(page.getByLabel('Product to compare', { exact: true })).toHaveValue('product-041');
  await expect(page.getByLabel('Graph node', { exact: true })).toHaveValue('product-041');
  await expect(page.getByRole('img', { name: 'Relationships for Travel tripod', exact: true })).toBeVisible();
  await expect(page.locator('.lab-similarity-list li')).toHaveCount(5);
  await expect(page.locator('.lab-similarity-list')).not.toContainText('Travel tripod');
  const alternative = page.locator('.lab-similarity-list button').nth(1);
  await alternative.click();
  await expect(alternative).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lab-contributions')).toContainText('Contributions sum to the cosine score');
  await page.getByLabel('Graph node', { exact: true }).selectOption('customer-001');
  await expect(page.getByRole('img', { name: 'Relationships for Demo shopper 01', exact: true })).toBeVisible();
  await page.getByText(/^View relationships table/).click();
  await expect(page.getByRole('region', { name: 'Graph relationships table', exact: true })).toContainText('Purchased');
  await page.getByLabel('Search products', { exact: true }).fill('no-such-product');
  await expect(page.getByText('No products match these filters.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear product filters', exact: true }).click();
  await expect(dataset.locator('tbody tr')).toHaveCount(48);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (let theme = 0; theme < 2; theme++) {
      await page.getByRole('button', { name: /Use .* theme/ }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
