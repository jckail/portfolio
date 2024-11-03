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
        {resumeData?.github && (
          <a href={resumeData.github} target="_blank" rel="noopener noreferrer">
            <img
              src={`/images/${theme === 'light' ? 'light' : 'dark'}_mode_github.png`}
              alt="GitHub"
            />
          </a>
        )}
        {resumeData?.linkedin && (
          <a href={resumeData.linkedin} target="_blank" rel="noopener noreferrer">
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
