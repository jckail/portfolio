import React from 'react';
import { scrollToSection } from '../../shared/utils/scroll-utils';
import '../../styles/components/footer.css';

interface FooterProps {
  onDoodleToggle: () => void;
  doodleClickCount: number;
  toggleTheme: () => void;
}

const Footer: React.FC<FooterProps> = ({ onDoodleToggle, doodleClickCount }) => {
  const getDoodleText = () => {
    return doodleClickCount === 0 ? "Click To Doodle" : "Click again to doodle more";
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
          <span 
            onClick={onDoodleToggle}
            className="footer-link"
          >
            {getDoodleText()}
          </span>
          <span 
            onClick={handleScrollToTop}
            className="footer-link"
          >
            Scroll to top
          </span>
        </div>
        <p className="footer-text">
          © {new Date().getFullYear()} Jordan Kail. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
