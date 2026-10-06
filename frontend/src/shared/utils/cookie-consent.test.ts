import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  hasAnalyticsConsent,
  setCookieConsent,
  openCookieSettings,
} from './cookie-consent';

describe('retired consent compatibility', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  it.each([null, 'accepted', 'denied', 'malformed'])(
    'cannot grant tracking with saved state %s',
    (state) => {
      if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
      localStorage.setItem('theme', 'dark');
      sessionStorage.setItem('chat_session_id', 'chat_keep');
      window.gtag = vi.fn();
      window.loadGoogleAnalytics = vi.fn();
      const dispatch = vi.spyOn(window, 'dispatchEvent');
      expect(getCookieConsent()).toBeNull();
      expect(hasAnalyticsConsent()).toBe(false);
      setCookieConsent('accepted');
      setCookieConsent('denied');
      openCookieSettings();
      expect(hasAnalyticsConsent()).toBe(false);
      expect(window.gtag).not.toHaveBeenCalled();
      expect(window.loadGoogleAnalytics).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(sessionStorage.getItem('chat_session_id')).toBe('chat_keep');
      dispatch.mockRestore();
    }
  );
  it('never reads inaccessible consent storage', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getCookieConsent()).toBeNull();
    expect(() => setCookieConsent('accepted')).not.toThrow();
    expect(read).not.toHaveBeenCalled();
    read.mockRestore();
  });
});
