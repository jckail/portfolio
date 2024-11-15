import React, { useState, useEffect } from 'react';

import { Theme } from '../../theme/stores/theme-store';
import { Contact } from '../types';
import SidePanel from '../../layouts/components/side-panel';
import GitHubIcon from '../../theme/components/icons/github-icon';
import LinkedInIcon from '../../theme/components/icons/linkedin-icon';
import MoonIcon from '../../theme/components/icons/moon-icon';
import SunIcon from '../../theme/components/icons/sun-icon';
import PartyIcon from '../../theme/components/icons/party-icon';
import ResumeIcon from '../../theme/components/icons/resume-icon';
import SadwichIcon from '../../theme/components/icons/sandwich-icon';

import '../styles/header.css';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
  isToggleHidden: boolean;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn,
  isToggleHidden
}) => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [contactData, setContactData] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/contact');
        if (!response.ok) {
          throw new Error('Failed to fetch contact data');
        }
        const data = await response.json();
        setContactData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, []);

  const updateURL = (isOpen: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sidepanel', isOpen ? 'open' : 'closed');
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sidePanelState = params.get('sidepanel');
    const shouldBeOpen = sidePanelState === 'open';
    
    setIsSidePanelOpen(shouldBeOpen);
    
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

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <MoonIcon />;
      case 'dark':
        return <SunIcon />;
      case 'party':
        return <PartyIcon />;
      default:
        return <MoonIcon />;
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!contactData) return <div>No contact data available</div>;

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
              <SadwichIcon/>
            </button>
            <div className="header-titles">
              <h1>{contactData.firstName}{" "}{contactData.lastName}</h1>
              <h2>{contactData.title}</h2>
            </div>
          </div>
          <div className="nav-right">
            {contactData.github && (
              <a 
                href={contactData.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="icon-link"
                aria-label="GitHub Profile"
              >
                <GitHubIcon />
              </a>
            )}
            {contactData.linkedin && (
              <a 
                href={contactData.linkedin} 
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
              aria-label="Download Resume"
            >
              <strong>Resume</strong>
              <ResumeIcon/>
            </button>
          
            {!isToggleHidden && (
              <button 
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : 'light'} mode`}
              >
                {getThemeIcon()}
              </button>
            )}
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
