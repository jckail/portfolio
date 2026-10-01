import React, { useRef } from 'react';
import '../../../styles/components/cookie/cookie-banner.css';

interface CookieBannerProps {
  onAccept?: () => void;
  onDeny?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onDeny }) => {
  const bannerRef = useRef<HTMLDivElement>(null);

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
    <div className="cookie-banner" ref={bannerRef} role="region" aria-label="Cookie consent">
      <div className="cookie-content">
        <p>
          With your consent, this site uses Google Analytics cookies to understand
          traffic. Nothing is loaded unless you click &quot;Accept All&quot;, and you can
          change your choice anytime under &quot;Cookie settings&quot; in the footer.
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
