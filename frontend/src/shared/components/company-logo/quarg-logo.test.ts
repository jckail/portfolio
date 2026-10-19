import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isMarkOnlyLogo } from './CompanyLogo';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const STANDALONE = [
  'public/images/companylogos/quarg-mark-dark.svg',
  'public/images/companylogos/quarg-mark-light.svg',
  'public/images/companylogos/quarg-mark-mono.svg',
];

describe('Quarg mark', () => {
  it('is a symbol-only logo, so it gets a tile fitted to it', () => {
    expect(isMarkOnlyLogo('quarg.svg')).toBe(true);
    expect(isMarkOnlyLogo('prove.svg')).toBe(false);
  });

  it('has no wordmark text in the inline or standalone files', () => {
    for (const file of ['src/assets/icons/companylogos/quarg.svg', ...STANDALONE]) {
      expect(read(file), file).not.toMatch(/<text|<tspan/i);
    }
  });

  it('draws the three brand pieces from theme tokens, with brand fallbacks', () => {
    const svg = read('src/assets/icons/companylogos/quarg.svg');
    for (const [token, brand] of [
      ['magenta', '#ef2cc1'],
      ['lavender', '#caaef5'],
      ['orange', '#fc4c02'],
    ]) {
      expect(svg).toContain(`var(--quarg-${token}, ${brand})`);
    }
  });

  it('defines the tokens in every theme, with a darker lavender for light mode', () => {
    const theme = read('src/styles/base/theme.css');
    const block = (name: string) => theme.slice(theme.indexOf(`.theme-${name} {`)).split('\n}')[0];
    for (const name of ['light', 'dark', 'party']) {
      for (const token of ['magenta', 'lavender', 'orange']) {
        expect(block(name), `${name} ${token}`).toContain(`--quarg-${token}:`);
      }
    }
    // The brand lavender is 1.9:1 on white; light mode must not use it.
    expect(block('light')).toContain('--quarg-lavender: #a271ed');
    expect(block('dark')).toContain('--quarg-lavender: #caaef5');
  });

  it('ships a light standalone file whose lavender is not the washed-out brand tint', () => {
    expect(read(STANDALONE[1])).toContain('#a271ed');
    expect(read(STANDALONE[1])).not.toContain('#caaef5');
    expect(read(STANDALONE[0])).toContain('#caaef5');
    expect(read(STANDALONE[2])).toContain('currentColor');
  });
});
