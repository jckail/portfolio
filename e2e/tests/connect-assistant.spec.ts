import { test, expect } from './fixtures';

for (const theme of ['dark', 'light']) {
  for (const width of [390, 1440]) {
    test(`connect assistant overlays ${theme} portfolio at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/chat/status', route => route.fulfill({ json: { available: true } }));
      await page.route('**/api/agent/trial', route => route.fulfill({ status: 429, json: { detail: 'Synthetic admission limit' } }));
      await page.goto(`/?theme=${theme}`);
      const trigger = page.getByRole('button', { name: 'Connect your assistant', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Connect your assistant', exact: true });
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`theme=${theme}`));
      await expect(dialog.getByRole('tab', { name: 'Claude', exact: true })).toHaveAttribute('aria-selected', 'true');
      await dialog.getByRole('tab', { name: 'Codex', exact: true }).click();
      await expect(dialog.getByRole('textbox', { name: 'Connection command', exact: true })).toHaveValue('codex mcp add jordan-kail --url https://jordankail.ai/mcp');
      await dialog.getByRole('combobox', { name: 'Your computer', exact: true }).selectOption('windows');
      await expect(dialog.getByText('Windows: run in PowerShell. If your agent runs in WSL, select Linux.', { exact: true })).toBeVisible();
      await dialog.getByRole('tab', { name: 'Pi', exact: true }).click();
      await expect(dialog.getByRole('textbox', { name: 'Connection command', exact: true })).toHaveValue('pi mcp add jordan-kail --url https://jordankail.ai/mcp');
      const geometry = await dialog.boundingBox();
      expect(geometry).not.toBeNull();
      expect(geometry!.x).toBeGreaterThanOrEqual(0);
      expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.getByRole('dialog', { name: 'Connect your assistant' }).getByRole('button', { name: 'Chat with my Agent', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Connect your assistant' })).not.toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Chat with my Agent', exact: true })).toBeVisible();
    });
  }
}

test('fullscreen mobile composer fits a short viewport and keeps the draft across evidence toggles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await page.route('**/api/agent/trial', route => route.fulfill({ json: {
    token: 'synthetic-preview', mode: 'trial', remaining_messages: 2,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  } }));
  await page.routeWebSocket(/\/ws\//, socket => socket.onMessage(() => {}));
  await page.goto('/agent?theme=light');
  const composer = page.getByRole('textbox', { name: 'Message the AI assistant', exact: true });
  await composer.fill('Draft about an agent-platform opportunity');
  const geometry = await composer.boundingBox();
  expect(geometry).not.toBeNull();
  expect(geometry!.y + geometry!.height).toBeLessThanOrEqual(400);
  await page.getByRole('button', { name: 'View portfolio evidence', exact: true }).click();
  await expect(composer).toHaveValue('Draft about an agent-platform opportunity');
  await page.getByRole('button', { name: 'Hide portfolio evidence', exact: true }).click();
  await expect(composer).toBeVisible();
});
