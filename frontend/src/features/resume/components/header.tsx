import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ResumeData } from '../types';
import { Theme } from '../../theme/stores/theme-store';
import GitHubIcon from '../../theme/components/icons/github-icon';
import LinkedInIcon from '../../theme/components/icons/linkedin-icon';
import { SidePanel } from '../../layouts/components/side-panel';
import '../styles/header.css';

interface HeaderProps {
  resumeData: ResumeData | null;
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

const Header: React.FC<HeaderProps> = ({
  resumeData,
  theme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsMenuOpen(params.has('menu'));
  }, [location]);

  const toggleMenu = () => {
    const newIsOpen = !isMenuOpen;
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);
    
    if (newIsOpen) {
      params.set('menu', 'open');
    } else {
      params.delete('menu');
    }
    
    const newUrl = `${currentUrl.pathname}?${params.toString()}${currentUrl.hash}`;
    window.history.pushState({}, '', newUrl);
    setIsMenuOpen(newIsOpen);
  };

  return (
    <header className="header">
      <nav className="nav-container">
        <div className="nav-left">
          <button className="menu-button" onClick={toggleMenu} aria-label="Toggle navigation menu">
            <div className="menu-icon">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
          <div className="title-container">
            <h1>{resumeData?.name || 'Loading...'}</h1>
            <h2>{resumeData?.title || ''}</h2>
          </div>
        </div>
        <div className="nav-right">
          {resumeData?.github && (
            <a 
              href={resumeData.github} 
              target="_blank" 
              rel="noopener noreferrer"
              className="icon-link"
              aria-label="GitHub Profile"
            >
              <GitHubIcon />
            </a>
          )}
          {resumeData?.linkedin && (
            <a 
              href={resumeData.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="icon-link"
              aria-label="LinkedIn Profile"
            >
              <LinkedInIcon />
            </a>
          )}
          <button 
            onClick={handleResumeClick}
            className="resume-button"
          >
            See My Resume
          </button>
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>
      <SidePanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </header>
  );
};

export default Header;
