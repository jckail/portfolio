import { test, expect } from './fixtures';

test('two-message preview introduces the visitor before continuing in the right pane', async ({ page }) => {
  const expires_at = new Date(Date.now() + 3600000).toISOString();
  const frames: Record<string, unknown>[] = [];
  const introductions: unknown[] = [];
  let mode = 'trial';
  let remaining = 2;
  await page.route('**/api/chat/status', route => route.fulfill({ json: { available: true } }));
  await page.route('**/api/agent/trial', route => route.fulfill({
    json: { token: 'synthetic-trial', expires_at, mode: 'trial', remaining_messages: remaining },
  }));
  await page.route('**/api/agent/access', route => {
    if (route.request().method() === 'POST') introductions.push(route.request().postDataJSON());
    return route.fulfill({ json: { valid: true, token: 'synthetic-full', expires_at, mode: 'full' } });
  });
  await page.routeWebSocket(/\/ws\//, ws => {
    ws.onMessage(raw => {
      const frame = JSON.parse(String(raw)) as Record<string, unknown>;
      frames.push(frame);
      if (frame.type === 'access') {
        mode = frame.token === 'synthetic-full' ? 'full' : 'trial';
        ws.send(JSON.stringify({ type: 'access_status', mode, remaining_messages: remaining }));
      }
      if (frame.type === 'message') {
        if (mode === 'trial' && remaining === 0) {
          ws.send(JSON.stringify({ type: 'access_required', reason: 'trial_exhausted' }));
          return;
        }
        if (mode === 'trial') {
          remaining--;
          ws.send(JSON.stringify({ type: 'access_status', mode, remaining_messages: remaining }));
        }
        ws.send(JSON.stringify({ message: `Published portfolio answer ${3 - remaining}.`, is_chunk: false }));
      }
    });
  });

  await page.goto('/?theme=dark');
  const launcher = page.getByRole('button', { name: 'Chat with my Agent', exact: true });
  await expect(launcher).toBeVisible();
  const box = await launcher.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(page.viewportSize()!.width / 2);
  await launcher.click();
  const pane = page.getByRole('dialog', { name: 'Chat with my Agent' });
  await expect(pane).toBeVisible();
  await expect(page.getByLabel('Your email', { exact: true })).toHaveCount(0);
  for (const [index, question] of ['What agent platforms has Jordan built?', 'Which Jordan projects use Python?'].entries()) {
    await page.getByLabel('Message the AI assistant').fill(question);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(pane.getByText(`Published portfolio answer ${index + 2}.`)).toBeVisible();
  }
  await expect(page.getByLabel('Your email', { exact: true })).toBeVisible();
  expect(frames.filter(frame => frame.type === 'message')).toHaveLength(2);
  expect(introductions).toEqual([]);
  await page.getByLabel('Your email', { exact: true }).fill('synthetic-visitor@example.com');
  await page.getByLabel('Company or organization').fill('Synthetic Example Company');
  await pane.getByRole('button', { name: /conversation|continue/i }).click();
  await expect.poll(() => introductions).toEqual([{ email: 'synthetic-visitor@example.com', company: 'Synthetic Example Company' }]);
  await expect(page.getByLabel('Message the AI assistant')).toBeVisible();
  await page.getByLabel('Message the AI assistant').fill('How can Jordan help our agent platform team?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => frames.filter(frame => frame.type === 'message').length).toBe(3);
  await expect(pane.getByText('Published portfolio answer 2.')).toBeVisible();
});
