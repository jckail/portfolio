import React from 'react';
import SandwichMenu from './SandwichMenu';
import HeaderNav from './HeaderNav';
import { useAppLogic } from './AppLogicProvider';

const Header = ({ 
  resumeData, 
  theme, 
  toggleTheme, 
  handleResumeClick, 
  handleAdminClick, 
  isAdminLoggedIn,
  currentSection,
  handleSectionClick
}) => {
  const { toggleSidebar } = useAppLogic();

  return (
    <header className="floating-header">
      <div className="header-left">
        <SandwichMenu onClick={toggleSidebar} />
        <div className="name-title">
          <h1>{resumeData?.name || 'Loading...'}</h1>
          <h2>{resumeData?.title || ''}</h2>
        </div>
      </div>
      <div className="header-right">
        <HeaderNav 
          theme={theme} 
          onResumeClick={handleResumeClick}
          onAdminClick={handleAdminClick}
          isAdminLoggedIn={isAdminLoggedIn}
          currentSection={currentSection}
          handleSectionClick={handleSectionClick}
        />
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
};

export default Header;
