import React, { useRef, useEffect } from 'react'
import { getApiUrl } from '../utils/apiUtils'

// Define header nav height constant
const HEADER_NAV_HEIGHT = 65; // Base height in pixels

function HeaderNav({ resumeData, theme, onResumeClick, onHeightChange }) {
  const apiUrl = getApiUrl();
  const navRef = useRef(null);

  useEffect(() => {
    if (navRef.current && onHeightChange) {
      const updateHeight = () => {
        const height = Math.max(navRef.current.offsetHeight, HEADER_NAV_HEIGHT);
        onHeightChange(height);
      };

      // Update height initially and on resize
      updateHeight();
      window.addEventListener('resize', updateHeight);

      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [onHeightChange]);

  return (
    <nav 
      ref={navRef}
      className="header-nav"
      style={{ 
        height: HEADER_NAV_HEIGHT,
        minHeight: HEADER_NAV_HEIGHT,
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {resumeData?.github && (
        <a href={resumeData.github} target="_blank" rel="noopener noreferrer">
          <img 
            src={`${apiUrl}/images/${theme === 'light' ? "light_mode_github.png" : "dark_mode_github.png"}`} 
            alt="GitHub" 
            className="icon" 
          />
        </a>
      )}
      {resumeData?.linkedin && (
        <a href={resumeData.linkedin} target="_blank" rel="noopener noreferrer">
          <img 
            src={`${apiUrl}/images/${theme === 'light' ? "light_mode_linkedin.png" : "dark_mode_linkedin.png"}`} 
            alt="LinkedIn" 
            className="icon" 
          />
        </a>
      )}
      <a href="#my-resume" onClick={onResumeClick} className="resume-link">See My Resume</a>
    </nav>
  )
}

export default HeaderNav
