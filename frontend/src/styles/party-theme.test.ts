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
});
