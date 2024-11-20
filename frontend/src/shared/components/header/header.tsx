import React, { useState, useEffect, memo } from 'react';
import { Theme } from '../../../types/theme';
import { Contact } from '../../../types/resume';
import { SidePanel } from '../navigation';
import { useData } from '../../../app/providers/data-provider';
import {
  MoonIcon,
  SunIcon,
  PartyIcon,
  SandwichIcon
} from '../icons';

import '../../../styles/components/header/header.css';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
  isToggleHidden: boolean;
}

// Memoize icons to prevent unnecessary re-renders
const ThemeIcon = memo(({ theme }: { theme: Theme }) => {
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
});

// Loading state component
const HeaderSkeleton = () => (
  <header className="header">
    <nav className="nav-container">
      <div className="nav-left">
        <div className="header-titles skeleton">
          <div className="skeleton-text" style={{ width: '200px', height: '24px' }}></div>
          <div className="skeleton-text" style={{ width: '150px', height: '20px' }}></div>
        </div>
      </div>
    </nav>
  </header>
);

const Header: React.FC<HeaderProps> = memo(({
  theme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn,
  isToggleHidden
}) => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const { contactData, isLoading, error } = useData();

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

  if (error) return <div>Error: {error}</div>;
  if (isLoading || !contactData) return <HeaderSkeleton />;

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
              <SandwichIcon/>
            </button>
            <div className="header-titles">
              <h1>{contactData.firstName}{" "}{contactData.lastName}</h1>
              <h2>AI | Data Engineer</h2>
            </div>
          </div>
          <div className="nav-right">
            {!isToggleHidden && (
              <button 
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : 'light'} mode`}
              >
                <ThemeIcon theme={theme} />
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
});

export default Header;
