import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { COOKIE_CONSENT_KEY, setCookieConsent } from '../utils/cookie-consent';
import { flush, reset, resetForTests, track } from './core';
import { lengthBucket, sanitizeProps, scrubMessage, slugify, EVENT_NAMES } from './events';
import { reportDeepLinks, startTracker } from './tracker';

describe('retired product analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it.each([null, 'accepted', 'denied', 'malformed'])(
    'never queues or sends events with saved state %s',
    (state) => {
      if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
      const beacon = vi.fn();
      Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
      const fetch = vi.spyOn(globalThis, 'fetch');
      window.gtag = vi.fn();
      resetForTests();
      const stop = startTracker();
      setCookieConsent('accepted');
      for (let i = 0; i < 250; i += 1)
        for (const event of EVENT_NAMES) track(event, { section: 'about' }, { ga: true });
      reportDeepLinks('?skill=Python&ai_chat=open', '#projects');
      window.dispatchEvent(new Event('pagehide'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('storage'));
      vi.advanceTimersByTime(10_000);
      flush();
      reset();
      stop();
      expect(beacon).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(window.gtag).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('ga_session_id')).toBeNull();
    }
  );
  it('allowlists and bounds props', () => {
    expect(
      sanitizeProps({
        section: 'about',
        project: 'x'.repeat(80),
        skill: 'Python',
        email: 'a@b.co',
        message: 'mail me at jane@example.com or +1 (555) 123-4567',
        depth: '50',
        host: 'bad host',
        __proto__: { section: 'about' },
      })
    ).toEqual({ section: 'about', message: 'mail me at [email] or [number]', depth: '50' });
    expect(sanitizeProps({ constructor: 'x', toString: 'y' })).toEqual({});
  });

  it('scrubs and buckets', () => {
    expect(scrubMessage('fail https://x.test/?t=abc a@b.io')).toBe('fail [url] [email]');
    expect(scrubMessage('y'.repeat(500)).length).toBeLessThanOrEqual(120);
    expect(lengthBucket(0)).toBe('0');
    expect(lengthBucket(11)).toBe('11-50');
    expect(lengthBucket(5000)).toBe('201+');
    expect(slugify('Together AI')).toBe('together-ai');
  });
});
