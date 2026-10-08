import { test, expect } from './fixtures';

for (const theme of ['dark', 'light']) {
  for (const viewport of [{ width: 1360, height: 900 }, { width: 390, height: 844 }]) {
    test(`contact typing and delivery recovery: ${theme}, ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      let calls = 0;
      await page.route('**/api/contact/draft', async route => {
        expect(route.request().postDataJSON()).toEqual({ intent: 'opportunity' });
        await route.fulfill({ json: { message: 'Hi Jordan, can we discuss your agent-platform experience?' } });
      });
      await page.route('**/api/contact/send-email', async route => {
        calls++;
        expect(route.request().postDataJSON()).toEqual({
          from_email: 'visitor@example.com', company: 'Example Labs',
          subject: 'Agent platforms / hiring?', message: 'Hello Jordan\nCan we discuss your work?',
        });
        await route.fulfill({ status: calls === 1 ? 502 : 200, contentType: 'application/json',
          body: calls === 1 ? '{"detail":"Unable to send message right now"}'
            : '{"message":"Email sent successfully","status_code":202,"phone":"+12025550100"}' });
      });
      await page.goto(`/?theme=${theme}&contact=open#about`);
      const dialog = page.getByRole('dialog', { name: 'Connect with Jordan', exact: true });
      await expect(dialog.getByText(/Recommended by my AI agent/)).toBeVisible();
      await dialog.getByText('Edit subject', { exact: true }).click();
      for (const [label, value] of [
        ['Your email', 'visitor@example.com'], ['Company or organization', 'Example Labs'],
        ['Subject', 'Agent platforms / hiring?'], ['Send me a message', 'Hello Jordan\nCan we discuss your work?'],
      ]) {
        const field = dialog.getByLabel(label, { exact: true });
        await field.clear();
        await field.pressSequentially(value);
        await expect(field).toHaveValue(value);
        await expect(field).toBeFocused();
      }
      await expect(dialog.locator('a[href^="tel:"]')).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Send message & connect', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Your message has not been sent');
      await expect(dialog.getByLabel('Your email', { exact: true })).toHaveValue('visitor@example.com');
      await expect(dialog.locator('a[href^="tel:"]')).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Send message & connect', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('Message sent successfully!');
      await expect(dialog.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+12025550100');
      expect(calls).toBe(2);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  }
}
test('late AI recommendation preserves focus and manual edits', async ({ page }) => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/contact/draft', async route => {
    await wait;
    await route.fulfill({ json: { message: 'A different recommendation' } });
  });
  await page.goto('/?theme=dark&contact=open#about');
  const dialog = page.getByRole('dialog', { name: 'Connect with Jordan' });
  const message = dialog.getByLabel('Send me a message', { exact: true });
  await message.clear();
  await message.pressSequentially('My own message / about agents?');
  release();
  await expect(dialog.getByText('Your edits are safe. My agent also suggests:')).toBeVisible();
  await expect(message).toHaveValue('My own message / about agents?');
  await expect(message).toBeFocused();
  await dialog.getByLabel('Your email', { exact: true }).fill('visitor@example.com');
  await dialog.getByLabel('Company or organization', { exact: true }).fill('Example Labs');
  await dialog.getByRole('button', { name: 'Use agent recommendation' }).click();
  await expect(message).toHaveValue('A different recommendation\n\nMy email: visitor@example.com\nCompany: Example Labs');
});

for (const width of [390, 1360]) {
  test(`contact retains keyboard focus above an open agent pane: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/chat/status', route => route.fulfill({ json: { available: true } }));
    await page.route('**/api/contact/draft', route => route.fulfill({ json: { message: 'Hi Jordan, let’s discuss agents.' } }));
    await page.route('**/api/agent/trial', route => route.fulfill({ json: {
      token: 'synthetic-contact-trial', mode: 'trial', remaining_messages: 2,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    } }));
    await page.routeWebSocket(/\/ws\//, ws => ws.onMessage(raw => {
      if (JSON.parse(String(raw)).type === 'access') {
        ws.send(JSON.stringify({ type: 'access_status', mode: 'trial', remaining_messages: 2 }));
      }
    }));
    await page.goto('/?theme=dark&ai_chat=open&contact=open#about');
    const contact = page.getByRole('dialog', { name: 'Connect with Jordan', exact: true });
    await expect(page.getByRole('dialog', { name: 'Chat with my Agent' })).toBeAttached();
    for (const [label, value] of [['Your email', 'visitor@example.com'], ['Company or organization', 'Example / Labs?'], ['Send me a message', 'Keyboard / agents?']]) {
      const input = contact.getByLabel(label, { exact: true });
      await input.clear();
      await input.pressSequentially(value);
      await expect(input).toHaveValue(value);
      await expect(input).toBeFocused();
    }
  });
}
