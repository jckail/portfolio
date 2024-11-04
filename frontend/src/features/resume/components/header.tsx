import React, { useState, useEffect } from 'react';
import { ResumeData } from '../types';
import { Theme } from '../../theme/stores/theme-store';
import GitHubIcon from '../../theme/components/icons/github-icon';
import LinkedInIcon from '../../theme/components/icons/linkedin-icon';
import SidePanel from '../../layouts/components/side-panel';
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
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Update URL to reflect current state
  const updateURL = (isOpen: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sidepanel', isOpen ? 'open' : 'closed');
    window.history.replaceState({}, '', url.toString());
  };

  // Initialize state from URL or default to closed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sidePanelState = params.get('sidepanel');
    const shouldBeOpen = sidePanelState === 'open';
    
    setIsSidePanelOpen(shouldBeOpen);
    
    // Ensure URL always shows the state, defaulting to closed if not set
    if (!sidePanelState) {
      updateURL(false);
    }
  }, []);

  const toggleSidePanel = () => {
    const newState = !isSidePanelOpen;
    setIsSidePanelOpen(newState);
    updateURL(newState);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    updateURL(false);
  };

  return (
    <>
      <header className="header">
        <nav className="nav-container">
          <div className="nav-left">
            <button 
              onClick={toggleSidePanel}
              className={`menu-toggle ${isSidePanelOpen ? 'active' : ''}`}
              aria-label="Toggle navigation menu"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="header-titles">
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
      </header>
      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={handleCloseSidePanel} 
      />
    </>
  );
};

export default Header;
