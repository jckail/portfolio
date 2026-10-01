import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { isScrollLocked, lockScroll, unlockScroll, useScrollLock } from './use-scroll-lock';

afterEach(() => {
  while (isScrollLocked()) unlockScroll();
  document.documentElement.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('useScrollLock', () => {
  it('is reference counted and restores the original inline style once', () => {
    document.documentElement.style.overflow = 'scroll';

    lockScroll();
    lockScroll();
    expect(document.documentElement.style.overflow).toBe('hidden');

    unlockScroll();
    expect(isScrollLocked()).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    unlockScroll();
    expect(isScrollLocked()).toBe(false);
    expect(document.documentElement.style.overflow).toBe('scroll');
  });

  it('ignores an unbalanced unlock', () => {
    unlockScroll();
    expect(isScrollLocked()).toBe(false);
    lockScroll();
    expect(isScrollLocked()).toBe(true);
  });

  it('locks only while active and releases on unmount', () => {
    const { rerender, unmount } = renderHook(({ active }) => useScrollLock(active), {
      initialProps: { active: false },
    });
    expect(isScrollLocked()).toBe(false);

    rerender({ active: true });
    expect(isScrollLocked()).toBe(true);

    unmount();
    expect(isScrollLocked()).toBe(false);
  });
});
