import { describe, expect, it } from 'vitest';

import { labSlugFromPath } from './lab-path';

describe('labSlugFromPath', () => {
  it.each([
    ['/aibilling', 'aibilling'],
    ['/aibilling/', 'aibilling'],
    ['/gopilot', 'gopilot'],
    ['/abc', 'abc'],
  ])('resolves %s', (path, slug) => expect(labSlugFromPath(path)).toBe(slug));

  it.each([
    '/',
    '/admin',
    '/admin/',
    '/dataplayground',
    '/api',
    '/docs',
    '/ab',
    '/1abc',
    '/Upper',
    '/two/segments',
    '/index.html',
    '/a-b-c',
    `/${'a'.repeat(32)}`,
  ])('leaves %s to the existing routes', (path) => expect(labSlugFromPath(path)).toBeNull());
});
