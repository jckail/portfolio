import { useState, useEffect } from 'react';
import '../styles/cookie-banner.css';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    window.gtag('consent', 'update', {
      'ad_storage': 'granted',
      'analytics_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted'
    });
    localStorage.setItem('cookieConsent', 'granted');
    setIsVisible(false);
  };

  const handleDenyAll = () => {
    window.gtag('consent', 'update', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });
    localStorage.setItem('cookieConsent', 'denied');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <p>
          We use cookies to enhance your browsing experience, serve personalized content, 
          and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
        </p>
        <div className="cookie-buttons">
          <button onClick={handleDenyAll} className="cookie-button deny">
            Deny All
          </button>
          <button onClick={handleAcceptAll} className="cookie-button accept">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
