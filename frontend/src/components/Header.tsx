import React from 'react';
import { ResumeData } from '../features/resume/types';
import { Theme } from '../features/theme/stores/theme-store';
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
  return (
    <header className="header">
      <nav className="nav-container">
        <div className="nav-left">
          <h1>{resumeData?.name || 'Loading...'}</h1>
          <h2>{resumeData?.title || ''}</h2>
        </div>
        <div className="nav-right">
          {resumeData?.github && (
            <a 
              href={resumeData.github} 
              target="_blank" 
              rel="noopener noreferrer"
              className="icon-link"
            >
              <img
                src={`/images/${theme === 'light' ? 'light' : 'dark'}_mode_github.png`}
                alt="GitHub"
              />
            </a>
          )}
          {resumeData?.linkedin && (
            <a 
              href={resumeData.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="icon-link"
            >
              <img
                src={`/images/${theme === 'light' ? 'light' : 'dark'}_mode_linkedin.png`}
                alt="LinkedIn"
              />
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
  );
};

export default Header;
