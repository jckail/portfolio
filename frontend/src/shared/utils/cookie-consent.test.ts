import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
  clearAnalyticsCookies,
  openCookieSettings,
  OPEN_COOKIE_SETTINGS_EVENT,
} from './cookie-consent';

describe('cookie-consent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no consent', () => {
    expect(getCookieConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists accept/deny', () => {
    setCookieConsent('accepted');
    expect(getCookieConsent()).toBe('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');

    setCookieConsent('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  describe('GA integration', () => {
    beforeEach(() => {
      window.gtag = vi.fn();
      window.loadGoogleAnalytics = vi.fn();
    });

    afterEach(() => {
      delete window.loadGoogleAnalytics;
    });

    it('sends all Consent Mode v2 signals on every update', () => {
      setCookieConsent('accepted');
      expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      setCookieConsent('denied');
      expect(window.gtag).toHaveBeenLastCalledWith('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });

    it('loads gtag.js only on accept', () => {
      setCookieConsent('denied');
      expect(window.loadGoogleAnalytics).not.toHaveBeenCalled();
      setCookieConsent('accepted');
      expect(window.loadGoogleAnalytics).toHaveBeenCalledTimes(1);
    });

    it('clears GA cookies when consent is denied or withdrawn', () => {
      document.cookie = '_ga=GA1.1.123; path=/';
      document.cookie = '_ga_2X0WFK46K5=GS1.1.456; path=/';
      document.cookie = 'unrelated=keep; path=/';
      setCookieConsent('denied');
      expect(document.cookie).not.toMatch(/_ga/);
      expect(document.cookie).toContain('unrelated=keep');
      document.cookie = 'unrelated=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  });

  it('clearAnalyticsCookies is a no-op without GA cookies', () => {
    expect(() => clearAnalyticsCookies()).not.toThrow();
  });

  it('openCookieSettings dispatches the reopen event', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
    openCookieSettings();
    window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
