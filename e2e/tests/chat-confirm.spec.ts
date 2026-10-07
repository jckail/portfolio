import { test, expect } from './fixtures';

test('chat confirmation card: validation, cancel, confirm and result', async ({ page }) => {
  await page.route('**/api/chat/status', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' }),
  );

  const received: Record<string, unknown>[] = [];
  await page.routeWebSocket(/\/ws\//, ws => {
    ws.onMessage(raw => {
      const frame = JSON.parse(String(raw)) as Record<string, unknown>;
      received.push(frame);
      if (frame.type === 'context') {
        ws.send(JSON.stringify({ type: 'confirm_action', id: 'act-1', tool: 'request_phone' }));
        ws.send(
          JSON.stringify({
            type: 'confirm_action',
            id: 'act-2',
            tool: 'contact_jordan',
            args: { subject: 'Hello', message: 'Say hi' },
          }),
        );
      }
      if (frame.type === 'confirm_action' && frame.id === 'act-2') {
        ws.send(JSON.stringify({ type: 'action_result', id: 'act-2', ok: true, message: 'Sent to Jordan.' }));
      }
    });
  });

  await page.route('**/api/agent/access', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ valid: true, mode: 'full', token: 'mock-access', expires_at: new Date(Date.now() + 3600000).toISOString() }),
  }));
  // This test starts with a synthetic, already-introduced visitor; no mail is sent.
  await page.addInitScript(() => sessionStorage.setItem('portfolio_agent_access', JSON.stringify({
    token: 'mock-access', mode: 'full', expires_at: new Date(Date.now() + 3600000).toISOString(),
  })));
  const response = await page.goto('/agent?theme=dark');
  expect(response?.status()).toBe(200);
  await expect.poll(() => received[0]).toEqual({ type: 'access', token: 'mock-access' });

  const phoneCard = page.getByRole('group', { name: "Request Jordan's phone number?" });
  const msgCard = page.getByRole('group', { name: 'Send this message to Jordan?' });
  await expect(phoneCard).toBeVisible();
  await expect(msgCard).toBeVisible();

  // Empty then invalid email: Confirm is blocked and nothing is sent.
  await msgCard.getByRole('button', { name: 'Confirm' }).click();
  await expect(msgCard.getByText('Enter your email so Jordan can reply.')).toBeVisible();
  await msgCard.getByLabel(/Your email/).fill('not-an-email');
  await msgCard.getByRole('button', { name: 'Confirm' }).click();
  await expect(msgCard.getByText('Enter a valid email address.')).toBeVisible();
  expect(received.filter(f => f.type === 'confirm_action')).toEqual([]);

  // Cancel sends cancel_action and settles the card.
  await phoneCard.getByRole('button', { name: 'Cancel' }).click();
  await expect(phoneCard.getByText('Cancelled. Nothing was sent.')).toBeVisible();
  await expect.poll(() => received.find(f => f.type === 'cancel_action')).toEqual({
    type: 'cancel_action',
    id: 'act-1',
  });

  // Confirm sends the id and trimmed email; the result renders.
  await msgCard.getByLabel(/Your email/).fill('  visitor@example.com ');
  await msgCard.getByRole('button', { name: 'Confirm' }).click();
  await expect(msgCard.getByText('Sent to Jordan.')).toBeVisible();
  const confirm = received.find(f => f.type === 'confirm_action');
  expect(confirm).toMatchObject({ type: 'confirm_action', id: 'act-2', email: 'visitor@example.com' });
});
