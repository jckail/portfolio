import { test, expect } from './fixtures';

for (const theme of ['dark', 'light']) {
  for (const viewport of [{ width: 1360, height: 900 }, { width: 390, height: 844 }]) {
    test(`contact typing and delivery recovery: ${theme}, ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      let calls = 0;
      await page.route('**/api/contact/send-email', async route => {
        calls++;
        expect(route.request().postDataJSON()).toEqual({
          from_email: 'visitor@example.com', subject: 'Agent platforms / hiring?',
          message: 'Hello Jordan\nCan we discuss your work?',
        });
        await route.fulfill({ status: calls === 1 ? 502 : 200, contentType: 'application/json',
          body: calls === 1 ? '{"detail":"Unable to send message right now"}'
            : '{"message":"Email sent successfully","status_code":202}' });
      });
      await page.goto(`/?theme=${theme}#about`);
      await page.getByRole('button', { name: 'View Contact', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Contact', exact: true });
      for (const [label, value] of [
        ['Your Email:', 'visitor@example.com'], ['Subject:', 'Agent platforms / hiring?'],
        ['Send me a message:', 'Hello Jordan\nCan we discuss your work?'],
        ['Your email', 'phone@example.com'],
      ]) {
        const field = dialog.getByLabel(label, { exact: true });
        await field.clear();
        await field.pressSequentially(value);
        await expect(field).toHaveValue(value);
        await expect(field).toBeFocused();
      }
      await dialog.getByRole('button', { name: 'Send Message', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Your message has not been sent');
      await expect(dialog.getByLabel('Your Email:', { exact: true })).toHaveValue('visitor@example.com');
      await expect(dialog.getByRole('link', { name: 'Send this draft with your email app' }))
        .toHaveAttribute('href', /^mailto:jckail13@gmail\.com\?subject=/);
      await dialog.getByRole('button', { name: 'Send Message', exact: true }).click();
      await expect(dialog.getByRole('status')).toHaveText('Message sent successfully!');
      expect(calls).toBe(2);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'View Contact', exact: true })).toBeFocused();
    });
  }
}
