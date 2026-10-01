import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import {
  OPEN_COOKIE_SETTINGS_EVENT,
  getCookieConsent,
  setCookieConsent,
} from '../../utils/cookie-consent';
import CookieBanner from './cookie-banner';

/**
 * Shows the cookie banner until the visitor accepts or denies, and again
 * whenever "Cookie settings" is used to change or withdraw that choice.
 * On accept, gtag.js is loaded; on deny, GA cookies are cleared.
 */
const CookieConsentPortal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!visible) return null;

  return createPortal(
    <CookieBanner
      onAccept={() => {
        setCookieConsent('accepted');
        setVisible(false);
      }}
      onDeny={() => {
        setCookieConsent('denied');
        setVisible(false);
      }}
    />,
    document.body
  );
};

export default CookieConsentPortal;
