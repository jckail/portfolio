import React, { useState, useEffect, useRef, memo } from 'react';

import { SidePanel } from '../../../shared/components/navigation';
import { getQueryParam, setQueryParam } from '../../../shared/utils/url-params';
import { useThemeStore } from '../../../shared/stores/theme-store';
import { useData } from '../../providers/data-provider';
import {
  MoonIcon,
  SunIcon,
  PartyIcon,
  SandwichIcon
} from '../../../shared/components/icons';

import type { Theme } from '../../../types/theme';
import '../../../styles/components/header/header.css';

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
ThemeIcon.displayName = 'ThemeIcon';


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

/**
 * Fixed top bar: menu toggle for the side panel, name, and the theme toggle.
 * Lives in app/ (not shared/) because it reads the resume data provider.
 * It subscribes to the theme store itself, so a theme toggle re-renders the
 * header rather than the whole page.
 */
const Header: React.FC = memo(() => {
  const theme = useThemeStore(state => state.theme);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const isToggleHidden = useThemeStore(state => state.isToggleHidden);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const { contactData, isLoading, error } = useData();

  const updateURL = (isOpen: boolean) => {
    setQueryParam('sidepanel', isOpen ? 'open' : null, { replace: true });
  };

  useEffect(() => {
    setIsSidePanelOpen(getQueryParam('sidepanel') === 'open');
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
              ref={menuToggleRef}
              type="button"
              onClick={toggleSidePanel}
              className={`menu-toggle btn-icon${isSidePanelOpen ? ' active' : ''}`}
              aria-label="Toggle navigation menu"
              aria-expanded={isSidePanelOpen}
              aria-controls="side-panel"
            >
              <SandwichIcon/>
            </button>
            <div className="header-titles">
              {/* Not headings: the page's single h1 is the hero name in About,
                  and a tagline is not a section title. */}
              <p className="header-name">{contactData.firstName}{" "}{contactData.lastName}</p>
              <p className="header-tagline">AI | Data | ML</p>
            </div>
          </div>
          <div className="nav-right">
            {!isToggleHidden && (
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle btn-icon"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
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
        returnFocusRef={menuToggleRef}
      />
    </>
  );
});
Header.displayName = 'Header';


export { Header };
export default Header;
