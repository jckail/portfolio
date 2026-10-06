/** Legacy compatibility API. Visitor analytics has been retired permanently. */
export const COOKIE_CONSENT_KEY = 'portfolio_cookie_consent';
export const OPEN_COOKIE_SETTINGS_EVENT = 'portfolio:open-cookie-settings';
export const CONSENT_CHANGE_EVENT = 'portfolio:consent-changed';
export type CookieConsent = 'accepted' | 'denied';

declare global {
  interface Window {
    /** Retired: kept only so older integrations can be tested safely. */
    loadGoogleAnalytics?: () => void;
  }
}

// Saved choices cannot grant analytics permission or activate a loader.
export function getCookieConsent(): CookieConsent | null {
  return null;
}
export function hasAnalyticsConsent(): boolean {
  return false;
}
export function setCookieConsent(_value: CookieConsent): void {}
export function clearAnalyticsCookies(): void {}
export function openCookieSettings(): void {}
