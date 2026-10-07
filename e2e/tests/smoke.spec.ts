import { test, expect } from './fixtures';

test('page loads, all sections render, and assistant entry opens', async ({ page }) => {
  await page.route('**/api/agent/trial', route => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ token: 'mock-trial', mode: 'trial', remaining_messages: 2,
      expires_at: new Date(Date.now() + 3600000).toISOString() }),
  }));
  await page.routeWebSocket(/\/ws\//, () => {});
  await page.goto('/');

  await expect(page).toHaveTitle(/Jordan Kail/);

  for (const id of ['about', 'experience', 'projects', 'skills']) {
    await expect(page.locator(`section#${id}`)).toBeAttached();
  }

  await page.getByRole('button', { name: 'Chat with my Agent', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Chat with my Agent' })).toBeVisible();
  await expect(page.getByLabel('Message the AI assistant')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});
