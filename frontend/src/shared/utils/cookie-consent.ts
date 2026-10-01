export const COOKIE_CONSENT_KEY = 'portfolio_cookie_consent';

/** Window event that asks the consent portal to show the banner again. */
export const OPEN_COOKIE_SETTINGS_EVENT = 'portfolio:open-cookie-settings';

export type CookieConsent = 'accepted' | 'denied';

declare global {
  interface Window {
    /** Defined by public/ga-init.js; injects gtag.js once consent is given. */
    loadGoogleAnalytics?: () => void;
  }
}

export function getCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === 'accepted' || value === 'denied') return value;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Expire every GA cookie (_ga, _ga_<id>, _gid, _gat*) on this host and each
 * parent domain. GA writes them on the registrable domain (e.g.
 * .jordan-kail.com), so clearing only the current host would leave them.
 */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map(part => part.split('=')[0].trim())
    .filter(name => /^(_ga|_gid|_gat)/.test(name));
  if (names.length === 0) return;

  const labels = window.location.hostname.split('.');
  const domains: (string | null)[] = [null];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(labels.slice(i).join('.'));
  }

  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = domain
        ? `${name}=; ${expired}; domain=.${domain}`
        : `${name}=; ${expired}`;
    }
  }
}

export function setCookieConsent(value: CookieConsent): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
  const granted = value === 'accepted';
  // Notify GA consent mode. Ad signals stay denied: the site runs no ads.
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
  if (granted) {
    // No-op if gtag.js is already on the page
    window.loadGoogleAnalytics?.();
  } else {
    clearAnalyticsCookies();
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'accepted';
}

/** Reopen the consent banner so the visitor can change or withdraw consent. */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
