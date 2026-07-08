import React from 'react';

import { scrollToSection } from '../../shared/utils/scroll-utils';
import { buttonize } from '../../shared/utils/a11y';
import '../../styles/components/footer.css';

interface FooterProps {
  onDoodleToggle: () => void;
  doodleClickCount: number;
  toggleTheme: () => void;
  isPartyMode: boolean;
}

const Footer: React.FC<FooterProps> = ({ onDoodleToggle, doodleClickCount, isPartyMode }) => {
  const getDoodleText = () => {
    if (isPartyMode) return "Click to end the party";
    return doodleClickCount === 0 ? "Click To Doodle with Dots" : "Click To Doodle with Doodles";
  };

  const handleScrollToTop = () => {
    scrollToSection('about');
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <a 
            href="/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            OpenAPI Doc
          </a>

          <span className="footer-link" {...buttonize(handleScrollToTop)}>
            Scroll to top
          </span>
          <span className="footer-link-doodle" {...buttonize(onDoodleToggle)}>
            {getDoodleText()}
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
