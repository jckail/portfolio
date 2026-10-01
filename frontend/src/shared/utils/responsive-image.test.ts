import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { buildHeadshotSrcSet } from './responsive-image';

const here = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(resolve(here, '../../../index.html'), 'utf8');
const aboutMe = JSON.parse(
  readFileSync(resolve(here, '../../../../backend/app/data/aboutme.json'), 'utf8')
) as { full_portrait: string };

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

describe('index.html headshot preload', () => {
  const preload = indexHtml.match(/<link\s+rel="preload"\s+as="image"[^>]*>/)?.[0] ?? '';

  it('preloads exactly the srcset the About <img> renders', () => {
    // A mismatch makes the browser fetch one variant early and a second one
    // for the <img> ("preloaded but not used").
    expect(preload).not.toBe('');
    const srcset = preload.match(/imagesrcset="([^"]*)"/)?.[1];
    expect(srcset).toBe(buildHeadshotSrcSet(aboutMe.full_portrait));
  });

  it('has no fixed href that would pin one density for every screen', () => {
    expect(preload).not.toMatch(/\shref=/);
  });
});
