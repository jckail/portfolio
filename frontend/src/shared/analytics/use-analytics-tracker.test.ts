import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOKIE_CONSENT_KEY } from '../utils/cookie-consent';
import { useAnalyticsTracker } from './use-analytics-tracker';

describe('retired analytics hook', () => {
  it('installs no observers, listeners or timers even with saved acceptance', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    const listener = vi.spyOn(window, 'addEventListener');
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const observer = vi.spyOn(globalThis, 'MutationObserver');
    const { unmount } = renderHook(() => useAnalyticsTracker());
    unmount();
    expect(listener).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
    listener.mockRestore();
    timer.mockRestore();
    observer.mockRestore();
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  });
});
