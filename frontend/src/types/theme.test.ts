import { describe, it, expect } from 'vitest';

import { THEMES, isTheme } from './theme';

describe('isTheme', () => {
  it.each(THEMES)('accepts %s', theme => {
    expect(isTheme(theme)).toBe(true);
  });

  it.each(['', 'Dark', 'neon', 'constructor', null, undefined, 1])('rejects %s', value => {
    expect(isTheme(value)).toBe(false);
  });
});
