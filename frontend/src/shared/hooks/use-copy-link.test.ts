import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useCopyLink } from './use-copy-link';

describe('useCopyLink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('copies the provided URL and flips the copied flag', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    const { result } = renderHook(() => useCopyLink('https://example.com/?project=jobbr'));

    await act(async () => {
      await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith('https://example.com/?project=jobbr');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });
});
