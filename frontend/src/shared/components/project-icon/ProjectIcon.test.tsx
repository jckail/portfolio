import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import ProjectIcon, { THEMED_PROJECT_ICONS, projectIconUrl } from './ProjectIcon';

const here = dirname(fileURLToPath(import.meta.url));
const glyphDir = resolve(here, '../../../assets/icons/project-glyphs');
afterEach(cleanup);

describe('ProjectIcon', () => {
  it('renders catalogue icons as sized themed SVGs with decorative defaults', async () => {
    const { container } = render(<ProjectIcon name="gopilot.svg" size={48} />);
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveClass('project-glyph');
    expect(svg).toHaveStyle({ color: 'var(--accent-text)' });
  });

  it('exposes a caller-provided meaningful name without hiding it', async () => {
    const { findByRole } = render(<ProjectIcon name="portfolio.svg" aria-label="Portfolio" />);
    expect(await findByRole('img', { name: 'Portfolio' })).toHaveAttribute('aria-hidden', 'false');
  });

  it('uses one geometry and theme contract for every original glyph', () => {
    const files = readdirSync(glyphDir).filter(f => f.endsWith('.svg'));
    expect(files).toHaveLength(17);
    const silhouettes = new Set<string>();
    for (const file of files) {
      expect(THEMED_PROJECT_ICONS.has(file), file).toBe(true);
      const svg = readFileSync(resolve(glyphDir, file), 'utf8');
      expect(svg).toContain('viewBox="0 0 32 32"');
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('stroke-width="1.8"');
      expect(svg).toContain('fill="none"');
      expect(svg).not.toMatch(/#[a-fA-F0-9]{3,8}|<image|<script/);
      silhouettes.add(svg);
    }
    expect(silhouettes.size).toBe(files.length);
  });

  it('retains legacy assets and safe URL fallbacks', () => {
    const { container } = render(<ProjectIcon name="gopilot-icon.svg" aria-label="Legacy goPilot" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Legacy goPilot');
    expect(projectIconUrl('gopilot-icon.svg')).not.toContain('/images/projects/');
    expect(projectIconUrl('constructor')).toBe('/images/projects/constructor');
    expect(projectIconUrl('missing.svg')).toBe('/images/projects/missing.svg');
  });
});
