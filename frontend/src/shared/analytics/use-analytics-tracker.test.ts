import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { setCookieConsent } from '../utils/cookie-consent';
import { flush, resetForTests } from './core';
import { resetTrackerForTests } from './tracker';
import { useAnalyticsTracker } from './use-analytics-tracker';

const beacon = vi.fn((_url: string, _body?: unknown) => true);

// jsdom cannot navigate; the tracker has already seen the click by now.
const noNav = (e: Event) => e.preventDefault();

describe('useAnalyticsTracker', () => {
  beforeEach(() => {
    document.addEventListener('click', noNav);
    localStorage.clear();
    resetForTests();
    resetTrackerForTests();
    beacon.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
  });
  afterEach(() => {
    document.body.innerHTML = '';
    document.removeEventListener('click', noNav);
  });

  it('stays inert for a prior accept and after that choice is withdrawn', async () => {
    const { unmount } = renderHook(() => useAnalyticsTracker());
    setCookieConsent('accepted');
    window.dispatchEvent(
      new CustomEvent('portfolio:track', {
        detail: { event: 'chat_action_confirmed', props: { tool: 'contact_jordan', email: 'a@b.co' } },
      })
    );
    flush();
    expect(beacon).not.toHaveBeenCalled();

    setCookieConsent('denied');
    const link = document.createElement('a');
    link.href = 'https://example.org/';
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    window.dispatchEvent(new CustomEvent('portfolio:track', { detail: { event: 'chat_open' } }));
    flush();
    expect(beacon).not.toHaveBeenCalled();
    unmount();
  });
});
