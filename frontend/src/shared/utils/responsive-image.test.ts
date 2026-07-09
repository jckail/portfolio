import { describe, it, expect } from 'vitest';

import { buildHeadshotSrcSet } from './responsive-image';

describe('buildHeadshotSrcSet', () => {
  it('builds 1x/2x/3x descriptors from a path with an extension', () => {
    expect(buildHeadshotSrcSet('/images/headshot/headshot.webp')).toBe(
      '/images/headshot/headshot-1x.webp 1x, /images/headshot/headshot-2x.webp 2x, /images/headshot/headshot.webp 3x'
    );
  });

  it('falls back to the original path when there is no extension', () => {
    expect(buildHeadshotSrcSet('/images/headshot/headshot')).toBe(
      '/images/headshot/headshot'
    );
  });
});
