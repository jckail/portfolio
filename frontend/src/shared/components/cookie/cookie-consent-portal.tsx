import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import {
  getCookieConsent,
  setCookieConsent,
} from '../../utils/cookie-consent';
import CookieBanner from './cookie-banner';

/**
 * Shows the cookie banner until the visitor accepts or denies.
 * On accept, updates GA consent mode so analytics events start flowing.
 */
const CookieConsentPortal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
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
