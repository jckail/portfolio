import React, { useEffect, useRef } from 'react';
import '../../../styles/components/cookie/cookie-banner.css';

interface CookieBannerProps {
  onAccept?: () => void;
  onDeny?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onDeny }) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Publish the banner's height so the fixed chat launcher can sit above it
  // instead of underneath. Cleared when the banner is dismissed or unmounts.
  useEffect(() => {
    const el = bannerRef.current;
    const root = document.documentElement;
    if (!el) return undefined;
    const publish = () => {
      root.style.setProperty('--cookie-banner-height', `${el.offsetHeight}px`);
    };
    publish();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--cookie-banner-height');
    };
  }, []);

  const clearBannerHeight = () => {
    document.documentElement.style.removeProperty('--cookie-banner-height');
  };

  const handleAcceptAll = () => {
    if (onAccept) onAccept();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
    clearBannerHeight();
  };

  const handleDenyAll = () => {
    if (onDeny) onDeny();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
    clearBannerHeight();
  };

  return (
    <div className="cookie-banner" ref={bannerRef} role="region" aria-label="Cookie consent">
      <div className="cookie-content">
        <p>
          With your consent, this site uses Google Analytics cookies to understand
          traffic. Nothing is loaded unless you click &quot;Accept All&quot;
          <span className="cookie-detail">
            , and you can change your choice anytime under &quot;Cookie settings&quot; in
            the footer
          </span>
          .
        </p>
        <div className="cookie-buttons">
          <button onClick={handleDenyAll} type="button" className="cookie-button deny btn">
            Deny All
          </button>
          <button onClick={handleAcceptAll} type="button" className="cookie-button accept btn btn-primary">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
