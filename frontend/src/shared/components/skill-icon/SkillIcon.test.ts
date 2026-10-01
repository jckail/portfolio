import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { INLINE_SKILL_ICONS } from './SkillIcon';
import { INLINE_COMPANY_LOGOS } from '../company-logo/CompanyLogo';

// The icon sets import `?react` SVGs, which only the Vite build (svgr) can
// load, so they are checked as source here rather than imported.
const here = dirname(fileURLToPath(import.meta.url));

function setEntries(file: string): Map<string, string> {
  const source = readFileSync(resolve(here, file), 'utf8');
  const imports = new Map(
    [...source.matchAll(/^import (\w+) from '([^']+)\?react';$/gm)].map(m => [m[1], m[2]])
  );
  return new Map(
    [...source.matchAll(/^ {2}'([^']+)': (\w+),$/gm)].map(m => [m[1], imports.get(m[2]) ?? ''])
  );
}

describe.each([
  ['skill icons', './skill-icon-set.ts', INLINE_SKILL_ICONS],
  ['company logos', '../company-logo/company-logo-set.ts', INLINE_COMPANY_LOGOS],
])('%s', (_label, file, names) => {
  const entries = setEntries(file);

  it('lists exactly the names the lazy set provides', () => {
    expect([...entries.keys()].sort()).toEqual([...names].sort());
  });

  it('points every entry at an SVG file of the same name', () => {
    for (const [name, path] of entries) {
      expect(path.endsWith(`/${name}`)).toBe(true);
      expect(existsSync(resolve(here, dirname(file), path))).toBe(true);
    }
  });
});
