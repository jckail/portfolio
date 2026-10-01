import { describe, it, expect } from 'vitest';

import { getOwn, toLookup } from './lookup';

const PROTOTYPE_KEYS = ['__proto__', 'constructor', 'hasOwnProperty', 'toString', 'valueOf'];

describe('getOwn', () => {
  const plain: Record<string, { name: string }> = JSON.parse('{"python": {"name": "Python"}}');

  it('returns own values', () => {
    expect(getOwn(plain, 'python')).toEqual({ name: 'Python' });
  });

  it.each(PROTOTYPE_KEYS)('ignores the inherited key %s on a plain object', key => {
    expect(getOwn(plain, key)).toBeUndefined();
  });

  it('tolerates missing maps and keys', () => {
    expect(getOwn(null, 'python')).toBeUndefined();
    expect(getOwn(undefined, 'python')).toBeUndefined();
    expect(getOwn(plain, null)).toBeUndefined();
    expect(getOwn(plain, undefined)).toBeUndefined();
  });

  it('works on null-prototype lookups', () => {
    const lookup = toLookup(plain);
    expect(getOwn(lookup, 'python')).toEqual({ name: 'Python' });
    expect(getOwn(lookup, 'constructor')).toBeUndefined();
  });
});
