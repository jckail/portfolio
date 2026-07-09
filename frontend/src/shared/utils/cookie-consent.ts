export const COOKIE_CONSENT_KEY = 'portfolio_cookie_consent';

export type CookieConsent = 'accepted' | 'denied';

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === 'accepted' || value === 'denied') return value;
  } catch {
    // ignore
  }
  return null;
}

export function setCookieConsent(value: CookieConsent): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
  // Notify GA consent mode if gtag is present
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: value === 'accepted' ? 'granted' : 'denied',
      ad_storage: 'denied',
    });
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'accepted';
}
