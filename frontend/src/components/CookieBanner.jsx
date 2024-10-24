import React, { useRef } from 'react';
import '../styles/cookie-banner.css';

const CookieBanner = ({ onAccept, onDeny }) => {
  const bannerRef = useRef(null);

  const handleAcceptAll = () => {
    if (onAccept) onAccept();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
  };

  const handleDenyAll = () => {
    if (onDeny) onDeny();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
  };

  return (
    <div className="cookie-banner" ref={bannerRef}>
      <div className="cookie-content">
        <p>
          We use cookies to enhance your browsing experience and analyze our traffic.
          By clicking "Accept All", you consent to our use of cookies.
        </p>
        <div className="cookie-buttons">
          <button onClick={handleDenyAll} className="deny-button">
            Deny All
          </button>
          <button onClick={handleAcceptAll} className="accept-button">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
