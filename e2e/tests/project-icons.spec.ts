import { test, expect } from './fixtures';

for (const theme of ['dark', 'light']) {
  for (const width of [390, 1440]) {
    test(`catalogue glyph continuity: ${theme}, ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?theme=${theme}#projects`);
      const catalogue = page.locator('.project-catalogue');
      await catalogue.getByRole('tab', { name: 'All projects', exact: true }).click();
      const cards = catalogue.locator('article');
      const glyphs = cards.locator('svg.project-glyph');
      await expect(cards).toHaveCount(16);
      await expect(glyphs).toHaveCount(16);
      await expect(cards.locator('.project-image img')).toHaveCount(0);
      const silhouettes = new Set<string>();
      for (let index = 0; index < 16; index++) {
        const glyph = glyphs.nth(index);
        await expect(glyph).toHaveAttribute('viewBox', '0 0 32 32');
        await expect(glyph).toHaveAttribute('stroke', 'currentColor');
        await expect(glyph).toHaveAttribute('fill', 'none');
        await expect(glyph).toHaveAttribute('aria-hidden', 'true');
        expect(await glyph.evaluate(element => {
          const style = getComputedStyle(element);
          return style.stroke === style.color && style.color !== 'rgba(0, 0, 0, 0)';
        })).toBe(true);
        silhouettes.add(await glyph.innerHTML());
      }
      expect(silhouettes.size).toBe(16);
      const first = cards.first();
      const title = await first.locator('h3').innerText();
      const silhouette = await first.locator('svg.project-glyph').innerHTML();
      const color = await first.locator('svg.project-glyph').evaluate(element => getComputedStyle(element).color);
      await first.getByRole('button', { name: 'View details', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: title, exact: true });
      const modalGlyph = dialog.locator('svg.project-glyph');
      await expect(modalGlyph).toHaveAttribute('aria-label', title);
      expect(await modalGlyph.innerHTML()).toBe(silhouette);
      expect(await modalGlyph.evaluate(element => getComputedStyle(element).color)).toBe(color);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
