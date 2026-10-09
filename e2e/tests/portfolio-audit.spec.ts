import { test, expect } from './fixtures';

for (const theme of ['dark', 'light']) {
  for (const width of [390, 1440]) {
    test(`public projects and scroll navigation: ${theme}, ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?theme=${theme}#about`);
      const nav = page.getByRole('navigation', { name: 'Page timeline' });
      await expect(nav).toHaveCount(0);
      await page.getByRole('link', { name: 'Explore engineering case studies' }).click();
      await expect(nav).toBeVisible();
      if (width <= 900) await expect(nav.getByRole('combobox', { name: 'Jump to section' })).toHaveValue('projects');
      else await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('aria-current', 'location');
      await page.getByRole('tab', { name: 'All projects', exact: true }).click();
      for (const name of ['OpenDataCenter', 'Kefi', 'Jobdog', 'Jobbr']) {
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      }
      const jobbr = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Jobbr', exact: true }) });
      await expect(jobbr.getByRole('link', { name: 'Open app', exact: true })).toHaveAttribute('href', 'https://jobdog.ai/jobbr/#/');
      const kefi = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Kefi', exact: true }) });
      await kefi.getByRole('button', { name: 'View details', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Kefi', exact: true });
      await expect(dialog.getByText('My contribution', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Evidence', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'Open product' })).toHaveAttribute('href', 'https://kefi.show/');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      if (width <= 900) await nav.getByRole('combobox', { name: 'Jump to section' }).selectOption('experience');
      else await nav.getByRole('link', { name: 'Experience', exact: true }).click();
      const milestones = nav.getByRole('combobox', { name: 'Jump to career milestone' });
      await expect(milestones).toBeVisible();
      await milestones.selectOption('experience-meta-facebook');
      await expect(page).toHaveURL(/#experience-meta-facebook$/);
      await expect(milestones).toHaveValue('experience-meta-facebook');
      await page.goBack();
      await expect(page).toHaveURL(/#experience$/);
      await page.goForward();
      await expect(page).toHaveURL(/#experience-meta-facebook$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('brand kit and privacy are reachable with local assets', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.goto('/brand-kit.html');
  await expect(page.getByRole('heading', { name: 'Jordan Kail', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download monogram SVG' })).toHaveAttribute('href', '/brand/jordan-kail-mark.svg');
  await page.evaluate(() => document.fonts.ready);
  expect(failures).toEqual([]);
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('body')).toContainText('30 days');
});


test('featured cases, filters, and deep links share the complete registry', async ({ page }) => {
  await page.goto('/?theme=dark#projects');
  const catalogue = page.locator('.project-catalogue');
  const section = page.locator('#projects');
  await expect(catalogue.getByRole('tab', { name: 'Featured', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(catalogue.locator('article')).toHaveCount(3);
  const compactHeight = (await section.boundingBox())!.height;
  await catalogue.getByRole('tab', { name: 'All projects', exact: true }).click();
  await expect(catalogue.locator('article')).toHaveCount(12);
  expect((await section.boundingBox())!.height).toBeGreaterThan(compactHeight);
  await catalogue.getByRole('tab', { name: 'Featured', exact: true }).click();
  await expect(catalogue.locator('article')).toHaveCount(3);
  expect(Math.abs((await section.boundingBox())!.height - compactHeight)).toBeLessThan(2);
  await catalogue.getByRole('tab', { name: 'Developer tools', exact: true }).click();
  await expect(catalogue.getByRole('tab', { name: 'Developer tools', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(catalogue.locator('article')).toHaveCount(2);
  await catalogue.getByRole('tab', { name: 'Developer tools', exact: true }).press('Home');
  await expect(catalogue.getByRole('tab', { name: 'Featured', exact: true })).toBeFocused();
  await page.goto('/?project=pointup&theme=dark#projects');
  const dialog = page.getByRole('dialog', { name: 'PointUp', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Decisions and tradeoffs' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('brand showcase switches theme and exercises shared components without sending data', async ({ page }) => {
  await page.goto('/brand-kit.html?theme=dark');
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Light theme', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'Your email', exact: true }).fill('portfolio-uat@example.com');
  await page.getByRole('button', { name: 'Preview confirmation' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preview complete. Nothing was sent.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
});
