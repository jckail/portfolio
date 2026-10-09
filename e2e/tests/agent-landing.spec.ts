import { test, expect } from './fixtures';

for (const [theme, width, height] of [
  ['dark', 1440, 900], ['light', 1440, 600],
  ['dark', 390, 844], ['light', 390, 600],
] as const) {
  test(`agent landing, connection modal and introduction in ${theme} ${width}x${height}`, async ({ page, request, baseURL }, testInfo) => {
    const expires_at = new Date(Date.now() + 3600000).toISOString();
    // The Vite development server does not proxy this public discovery route.
    if (baseURL?.includes(':18081')) {
      const context = await request.get('http://localhost:8080/context.json');
      const evidence = await context.json();
      await page.route('**/context.json', route => route.fulfill({ json: evidence }));
    }
    await page.route('**/api/chat/status', route => route.fulfill({ json: { available: true } }));
    await page.route('**/api/agent/trial', route => route.fulfill({ json: {
      token: 'synthetic-landing', expires_at, mode: 'trial', remaining_messages: 2,
    } }));
    let remaining = 2;
    await page.routeWebSocket(/\/ws\//, ws => ws.onMessage(raw => {
      const frame = JSON.parse(String(raw));
      if (frame.type === 'access') ws.send(JSON.stringify({ type: 'access_status', mode: 'trial', remaining_messages: remaining }));
      if (frame.type === 'message') {
        remaining--;
        ws.send(JSON.stringify({ type: 'access_status', mode: 'trial', remaining_messages: remaining }));
        ws.send(JSON.stringify({ message: 'Synthetic portfolio answer.', is_chunk: false }));
      }
    }));
    await page.setViewportSize({ width, height });
    await page.goto(`/agent?theme=${theme}`);
    const composer = page.getByLabel('Message the AI assistant');
    await expect(composer).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What would you like to explore?' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.agent-conversation-start').evaluate(node => {
      const first = node.querySelector('button')!.getBoundingClientRect();
      const bounds = node.getBoundingClientRect();
      return node.scrollTop === 0 && first.top >= bounds.top && first.bottom <= bounds.bottom;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
    await composer.fill('Draft to preserve');
    await page.getByRole('button', { name: 'Connect your agent', exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Chat with my Agent', exact: true }).click();
    await expect(modal).toBeHidden();
    await expect(composer).toHaveValue('Draft to preserve');
    await expect(composer).toBeFocused();
    for (const question of ['Summarize Jordan’s experience.', 'Which projects should I explore?']) {
      await composer.fill(question);
      await page.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(page.getByText('Synthetic portfolio answer.').first()).toBeVisible();
    }
    const email = page.getByLabel('Your email', { exact: true });
    const company = page.getByLabel('Company or organization');
    await email.click();
    await page.keyboard.type('synthetic-landing@example.com');
    await company.click();
    await page.keyboard.type('Synthetic Landing Company');
    await expect(email).toHaveValue('synthetic-landing@example.com');
    await expect(company).toHaveValue('Synthetic Landing Company');
    const continueButton = page.getByRole('button', { name: 'Continue the conversation →' });
    await continueButton.scrollIntoViewIfNeeded();
    await expect(continueButton).toBeInViewport();
    expect(await page.locator('.agent-inline-gate').evaluate(node => getComputedStyle(node).overflowY)).toBe('visible');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('introduction.png'), fullPage: true });
    if (width < 1000) {
      await page.getByRole('button', { name: 'View portfolio evidence' }).click();
      await expect(page.getByRole('button', { name: 'Hide portfolio evidence' })).toHaveAttribute('aria-expanded', 'true');
    }
  });
}
