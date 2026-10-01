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

  it('is inert until Accept, and stops the moment consent is withdrawn', async () => {
    const { unmount } = renderHook(() => useAnalyticsTracker());
    window.dispatchEvent(new CustomEvent('portfolio:track', { detail: { event: 'chat_open' } }));
    flush();
    expect(beacon).not.toHaveBeenCalled();

    setCookieConsent('accepted');
    window.dispatchEvent(
      new CustomEvent('portfolio:track', {
        detail: { event: 'chat_action_confirmed', props: { tool: 'contact_jordan', email: 'a@b.co' } },
      })
    );
    flush();
    expect(beacon).toHaveBeenCalledTimes(1);

    setCookieConsent('denied');
    beacon.mockClear();
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
