// Google Analytics bootstrap.
//
// Kept as an external file so the CSP can drop script-src 'unsafe-inline'.
// Runs in basic consent mode: gtag.js is not fetched, and no page_view is
// sent, until the visitor accepts cookies (now, or on an earlier visit).
// cookie-consent.ts calls window.loadGoogleAnalytics() on "Accept All".
(function () {
  var MEASUREMENT_ID = 'G-2X0WFK46K5';
  var CONSENT_KEY = 'portfolio_cookie_consent';

  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the Arguments object itself, not an array copy.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  var loaded = false;
  window.loadGoogleAnalytics = function () {
    if (loaded) return;
    loaded = true;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);
  };

  try {
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
      window.loadGoogleAnalytics();
    }
  } catch (e) {
    // Storage blocked: treat as no consent.
  }
})();
