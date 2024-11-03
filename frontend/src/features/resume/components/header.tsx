import React from 'react';
import { ResumeData } from '../types';
import { Theme } from '../../theme/stores/theme-store';

interface HeaderProps {
  resumeData: ResumeData | null;
  theme: Theme;
}

const Header: React.FC<HeaderProps> = ({ resumeData, theme }) => {
  return (
    <div className="header-links">
      <div className="social-links">
        {resumeData?.contact.github && (
          <a href={resumeData.contact.github} target="_blank" rel="noopener noreferrer">
            <img
              src={`/images/${theme === 'light' ? 'light' : 'dark'}_mode_github.png`}
              alt="GitHub"
            />
          </a>
        )}
        {resumeData?.contact.linkedin && (
          <a href={resumeData.contact.linkedin} target="_blank" rel="noopener noreferrer">
            <img
              src={`/images/${theme === 'light' ? 'light' : 'dark'}_mode_linkedin.png`}
              alt="LinkedIn"
            />
          </a>
        )}
      </div>
    </div>
  );
};

export default Header;
