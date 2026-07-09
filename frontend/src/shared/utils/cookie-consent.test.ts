import { describe, it, expect, beforeEach } from 'vitest';

import {
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
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
});
