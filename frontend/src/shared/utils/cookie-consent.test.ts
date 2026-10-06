import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
  clearAnalyticsCookies,
  disableBrowserAnalytics,
  openCookieSettings,
  OPEN_COOKIE_SETTINGS_EVENT,
} from './cookie-consent';

describe('cookie-consent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not grant analytics for a missing, denied, or previously accepted choice', () => {
    expect(getCookieConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);

    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    expect(getCookieConsent()).toBe('accepted');
    expect(hasAnalyticsConsent()).toBe(false);

    localStorage.setItem(COOKIE_CONSENT_KEY, 'denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(() => getCookieConsent()).not.toThrow();
    expect(() => setCookieConsent('accepted')).not.toThrow();
    expect(() => disableBrowserAnalytics()).not.toThrow();
  });

  describe('GA stays off', () => {
    beforeEach(() => {
      window.gtag = vi.fn();
      window.loadGoogleAnalytics = vi.fn();
    });

    afterEach(() => {
      delete window.loadGoogleAnalytics;
    });

    it('does not update consent mode or load gtag.js when a choice is stored', () => {
      setCookieConsent('accepted');
      setCookieConsent('denied');
      expect(window.gtag).not.toHaveBeenCalled();
      expect(window.loadGoogleAnalytics).not.toHaveBeenCalled();
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('clears GA cookies without removing unrelated cookies', () => {
      document.cookie = '_ga=GA1.1.123; path=/';
      document.cookie = '_ga_2X0WFK46K5=GS1.1.456; path=/';
      document.cookie = 'unrelated=keep; path=/';
      disableBrowserAnalytics();
      expect(document.cookie).not.toMatch(/_ga/);
      expect(document.cookie).toContain('unrelated=keep');
      document.cookie = 'unrelated=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  });

  it('clearAnalyticsCookies is a no-op without GA cookies', () => {
    expect(() => clearAnalyticsCookies()).not.toThrow();
  });

  it('does not throw when reading cookies fails', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    expect(() => clearAnalyticsCookies()).not.toThrow();
    if (descriptor) Object.defineProperty(Document.prototype, 'cookie', descriptor);
    else delete (document as { cookie?: string }).cookie;
  });

  it('openCookieSettings dispatches the reopen event', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
    openCookieSettings();
    window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
