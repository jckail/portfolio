import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import ProjectIcon, { THEMED_PROJECT_ICONS, projectIconUrl } from './ProjectIcon';

const here = dirname(fileURLToPath(import.meta.url));
const iconDir = resolve(here, '../../../assets/icons/projects');

afterEach(() => cleanup());

describe('ProjectIcon', () => {
  it('renders a bundled, non-themed icon as one sized <img>, not inline SVG', () => {
    const { container } = render(<ProjectIcon name="gopilot-icon.svg" size={100} aria-hidden />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(img).toHaveAttribute('width', '100');
    expect(img).toHaveAttribute('height', '100');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('loading', 'lazy');
    // Resolved through the bundler, not the public/ fallback path.
    expect(img?.getAttribute('src')).not.toContain('/images/projects/');
  });

  it('uses the aria-label as alt text when the caller names the icon', () => {
    const { container } = render(<ProjectIcon name="jk-icon.svg" aria-label="Portfolio" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Portfolio');
  });

  it('falls back to /images/projects for names that are not bundled', () => {
    expect(projectIconUrl('ai_billing.svg')).toBe('/images/projects/ai_billing.svg');
  });

  it('does not treat Object.prototype keys as bundled icons', () => {
    expect(projectIconUrl('constructor')).toBe('/images/projects/constructor');
  });

  it('keeps every themed icon an inline SVG in project-icon-set', () => {
    const source = readFileSync(resolve(here, 'project-icon-set.ts'), 'utf8');
    const listed = [...source.matchAll(/^ {2}'([^']+)': \w+,$/gm)].map(m => m[1]).sort();
    expect(listed).toEqual([...THEMED_PROJECT_ICONS].sort());
    const icon = readFileSync(resolve(here, 'ProjectIcon.tsx'), 'utf8');
    for (const name of THEMED_PROJECT_ICONS) {
      // Excluded from the URL glob, so it is not bundled twice.
      expect(icon).toContain(`'!**/${name}'`);
      expect(projectIconUrl(name)).toContain('/images/projects/');
      const svg = readFileSync(resolve(iconDir, name), 'utf8');
      // The reason it is inline: it paints with the theme's text color.
      expect(svg).toMatch(/var\(--text-color\)|currentColor/);
    }
  });

  it('serves every other icon as a URL because it does not depend on the theme', () => {
    const files = readdirSync(iconDir).filter(f => f.endsWith('.svg') && f !== 'old-jk-icon.svg');
    for (const file of files.filter(f => !THEMED_PROJECT_ICONS.has(f))) {
      const svg = readFileSync(resolve(iconDir, file), 'utf8');
      expect(svg, file).not.toMatch(/var\(--|currentColor/);
      // An <img> only scales an SVG that has a viewBox.
      expect(svg, file).toMatch(/viewBox=/);
      expect(projectIconUrl(file), file).not.toContain('/images/projects/');
    }
  });
});
