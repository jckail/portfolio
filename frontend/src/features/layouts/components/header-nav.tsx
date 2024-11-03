import React from 'react';
import { Theme } from '@/features/theme/stores/theme-store';
import '../styles/nav.css';

interface HeaderNavProps {
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

const HeaderNav: React.FC<HeaderNavProps> = ({
  theme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn
}) => {
  return (
    <nav className="header-nav">
      <div className="nav-buttons">
        <button 
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button 
          onClick={handleResumeClick}
          className="resume-button"
        >
          Resume
        </button>
        <button 
          onClick={handleAdminClick}
          className="admin-button"
        >
          {isAdminLoggedIn ? 'Logout' : 'Admin'}
        </button>
      </div>
    </nav>
  );
};

export default HeaderNav;
