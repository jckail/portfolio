import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './use-media-query';

function stubMatchMedia(initial: boolean) {
  let listener: ((e: { matches: boolean }) => void) | null = null;
  const removeEventListener = vi.fn();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: initial,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      listener = cb;
    },
    removeEventListener,
  })) as unknown as typeof window.matchMedia;
  return { fire: (m: boolean) => listener?.({ matches: m }), removeEventListener };
}

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('starts from the current match state and follows changes', () => {
    const mq = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
    act(() => mq.fire(false));
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const mq = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1px)'));
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
