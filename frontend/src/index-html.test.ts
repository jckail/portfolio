import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

// Locks the render-path choices in index.html (see the comments there).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const publicPath = (url: string) => resolve(root, 'public', url.replace(/^\//, ''));

describe('index.html', () => {
  it('does not bootstrap visitor analytics', () => {
    expect(html).not.toMatch(/ga-init|googletagmanager|google-analytics/);
  });

  it('does not depend on Google Fonts', () => {
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('self-hosts every @font-face source, with font-display: swap', () => {
    const faces = [...html.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face).toMatch(/font-display:\s*swap/);
      const src = face.match(/url\(([^)]+)\)/)?.[1] ?? '';
      expect(src).toMatch(/^\/fonts\/.+\.woff2$/);
      expect(existsSync(publicPath(src)), src).toBe(true);
    }
  });

  it('preloads only fonts that an @font-face uses, with crossorigin', () => {
    const preloads = [...html.matchAll(/<link\s+rel="preload"\s+as="font"[^>]*>/g)].map(
      (m) => m[0]
    );
    expect(preloads.length).toBeGreaterThan(0);
    expect(preloads.length).toBeLessThanOrEqual(2);
    for (const tag of preloads) {
      expect(tag).toMatch(/\scrossorigin[\s>]/);
      const href = tag.match(/href="([^"]+)"/)?.[1] ?? '';
      expect(html).toContain(`url(${href})`);
    }
  });

  it('ships the OFL license next to the font files', () => {
    expect(existsSync(publicPath('/fonts/OFL-Montserrat.txt'))).toBe(true);
    expect(existsSync(publicPath('/fonts/OFL-Quantico.txt'))).toBe(true);
  });
});
