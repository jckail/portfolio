/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve as resolvePath, sep } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Fails when a stylesheet (or inline style) the app actually loads reads a
 * custom property that nothing defines. An undefined var() silently computes
 * to the property's initial value: that is how the header and nav drawer
 * ended up with a transparent background (--surface) and no border
 * (--border).
 *
 * "Actually loads" = reachable from src/main.tsx through static imports,
 * lazy import() calls, CSS imports and CSS @import, so dead stylesheets
 * don't produce noise. var(--x, fallback) is allowed.
 */

// Read from disk: under Vitest, CSS (even with ?raw) is stubbed to ''.
const SRC_DIR = resolvePath(__dirname, '..');
const sources: Record<string, string> = {};
for (const entry of readdirSync(SRC_DIR, { recursive: true }) as string[]) {
  if (!/\.(tsx?|css)$/.test(entry)) continue;
  const key = `/src/${relative(SRC_DIR, join(SRC_DIR, entry)).split(sep).join('/')}`;
  sources[key] = readFileSync(join(SRC_DIR, entry), 'utf8');
}

const ENTRY = '/src/main.tsx';
const SCRIPT_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function dirname(path: string) {
  return path.slice(0, path.lastIndexOf('/'));
}

function normalize(path: string) {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return `/${out.join('/')}`;
}

function resolve(from: string, spec: string): string | undefined {
  let base: string;
  if (spec.startsWith('@/')) base = `/src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = normalize(`${dirname(from)}/${spec}`);
  else return undefined; // package import
  if (base.endsWith('.css')) return base in sources ? base : undefined;
  return SCRIPT_EXTENSIONS.map(ext => base + ext).find(candidate => candidate in sources);
}

function stripComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
}

function reachableFiles(): string[] {
  const seen = new Set<string>();
  const queue = [ENTRY];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = stripComments(sources[file]);
    const specs = file.endsWith('.css')
      ? Array.from(text.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g), m => m[1])
      : Array.from(
          text.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g),
          m => m[1]
        );
    for (const spec of specs) {
      const target = resolve(file, spec);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return Array.from(seen);
}

function lineOf(text: string, index: number) {
  return text.slice(0, index).split('\n').length;
}

describe('CSS custom properties', () => {
  it('reaches the stylesheets the app loads', () => {
    const files = reachableFiles();
    // Sanity check on the graph walk itself, so a regex regression cannot
    // turn the real assertion below into a vacuous pass.
    expect(files).toContain('/src/styles/base/theme.css');
    expect(files).toContain('/src/styles/components/modal.css');
    expect(files.filter(f => f.endsWith('.css')).length).toBeGreaterThan(15);
  });

  it('defines every var(--x) used without a fallback', () => {
    const files = reachableFiles();
    const defined = new Set<string>();
    const used: { name: string; where: string }[] = [];

    for (const file of files) {
      const text = stripComments(sources[file]);
      // Declarations in CSS (`--x: …`) and inline styles / setProperty in TS
      for (const m of text.matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)) defined.add(m[1]);
      for (const m of text.matchAll(/['"`](--[\w-]+)['"`]/g)) defined.add(m[1]);
      for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
        if (!m[2]) used.push({ name: m[1], where: `${file}:${lineOf(text, m.index!)}` });
      }
    }

    const undefinedUses = used
      .filter(use => !defined.has(use.name))
      .map(use => `${use.name} at ${use.where}`);
    expect(undefinedUses).toEqual([]);
  });

  it('gives every theme the same set of variables', () => {
    const theme = stripComments(sources['/src/styles/base/theme.css']);
    const blocks = Object.fromEntries(
      Array.from(theme.matchAll(/\.theme-(\w+)\s*\{([^}]*)\}/g), m => [
        m[1],
        new Set(Array.from(m[2].matchAll(/(--[\w-]+)\s*:/g), d => d[1])),
      ])
    );
    expect(Object.keys(blocks).sort()).toEqual(['dark', 'light', 'party']);

    const all = new Set(Object.values(blocks).flatMap(set => Array.from(set)));
    const missing = Object.entries(blocks).flatMap(([name, vars]) =>
      Array.from(all)
        .filter(v => !vars.has(v))
        .map(v => `.theme-${name} is missing ${v}`)
    );
    expect(missing).toEqual([]);
    for (const required of ['--surface', '--border', '--primary-color', '--primary-color-hover']) {
      expect(all.has(required)).toBe(true);
    }
  });
});
