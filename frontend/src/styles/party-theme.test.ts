/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

// Vitest stubs CSS imports, so read the stylesheet from disk.
const css = readFileSync(resolve(__dirname, 'base/theme.css'), 'utf8');

describe('party theme performance contract', () => {
  it('never animates every element (one animation per node froze Lighthouse)', () => {
    expect(css).not.toMatch(/\.theme-party\s*\*\s*\{[^}]*animation\s*:/);
  });

  it('drives the colour cycle from a single body animation, not <html>', () => {
    const rules = [...css.matchAll(/\.theme-party body\s*\{([^}]*)\}/g)].map(m => m[1]);
    expect(rules.some(r => /animation:\s*party-colors\b/.test(r))).toBe(true);
    expect(css).not.toMatch(/\.theme-party\s*\{[^}]*animation\s*:/);
  });

  it('steps the cycle so style recalculation is not run at 60Hz', () => {
    expect(css).toMatch(/animation:\s*party-colors\s+5s\s+steps\(\d+,\s*end\)\s+infinite/);
  });

  it('keeps the 87.5% bright stop that holds contrast at 4.5:1', () => {
    expect(css).toMatch(/87\.5%\s*\{\s*color:\s*#a0a0ff/);
  });

  describe('pinned contrast pairs', () => {
    const block = /\.theme-party\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const token = (name: string): string => {
      const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`).exec(block);
      if (!m) throw new Error(`missing party token ${name}`);
      return m[1];
    };
    const lum = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map(i => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string): number => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    it.each([
      ['skill chip', '--chip-text', '--chip-bg'],
      ['visit website button', '--btn-primary-text', '--btn-primary-bg'],
      ['chat header/user bubble on primary', '--party-pinned-fg', '--primary'],
      ['pinned text on cyan', '--party-pinned-fg', '--chip-bg'],
      ['doodle hint on page + 5% white', '--party-hint-text', '--page-bg'],
    ])('%s meets 4.5:1', (_label, fg, bg) => {
      // The hint sits on the page plus a 5% white panel, which is #0d0d0d.
      const bgHex = fg === '--party-hint-text' ? '#0d0d0d' : token(bg);
      expect(ratio(token(fg), bgHex)).toBeGreaterThanOrEqual(4.5);
    });

    it('excludes pinned controls from the animated colour override', () => {
      const notRule = css.slice(css.indexOf('.theme-party\n  :not('));
      for (const sel of ['.skm-chip', '.visit-website-btn', '.doodle-hint', '.party-pinned']) {
        expect(notRule.slice(0, notRule.indexOf('color: inherit'))).toContain(sel);
      }
    });
  });
});
