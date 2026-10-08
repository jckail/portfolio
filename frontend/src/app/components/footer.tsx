import React, { memo } from 'react';

import { scrollToSection } from '../../shared/utils/scroll-utils';
import { buttonize } from '../../shared/utils/a11y';
import '../../styles/components/footer.css';

interface FooterProps {
  onDoodleToggle: () => void;
  doodleClickCount: number;
  isPartyMode: boolean;
}

const scrollToTop = () => scrollToSection('about');

const Footer: React.FC<FooterProps> = memo(({ onDoodleToggle, doodleClickCount, isPartyMode }) => {
  const getDoodleText = () => {
    if (isPartyMode) return 'Click to end the party';
    return doodleClickCount === 0 ? 'Click To Doodle with Dots' : 'Click To Doodle with Doodles';
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          {/* The API docs are served only when the backend runs in dev mode */}
          {import.meta.env.DEV && (
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="footer-link">
              OpenAPI Doc
            </a>
          )}

          <a className="footer-link" href="/privacy/">Privacy</a>
          <a className="footer-link" href="/brand-kit.html">Brand kit</a>
          <span className="footer-link" {...buttonize(scrollToTop)}>
            Scroll to top
          </span>
          <span className="footer-link-doodle" {...buttonize(onDoodleToggle)}>
            {getDoodleText()}
          </span>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = 'Footer';

export default Footer;
