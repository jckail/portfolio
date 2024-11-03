import React, { useRef, useEffect, useState } from 'react'
import { useResume } from './ResumeProvider'
import { useAppLogic } from './AppLogicProvider'

const HEADER_NAV_HEIGHT = 65;

function HeaderNav({ 
  theme, 
  onResumeClick, 
  onHeightChange, 
  onAdminClick, 
  isAdminLoggedIn
}) {
  const apiUrl = "/api";
  const navRef = useRef(null);
  const { resumeData } = useResume();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (navRef.current && onHeightChange) {
      const updateHeight = () => {
        const height = Math.max(navRef.current.offsetHeight, HEADER_NAV_HEIGHT);
        onHeightChange(height);
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);

      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [onHeightChange]);

  useEffect(() => {
    const checkHash = () => {
      setShowAdmin(window.location.hash === '#admin');
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  return (
    <nav ref={navRef} className="header-nav">
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
      {showAdmin && (
        <button onClick={onAdminClick} className="admin-button">
          {isAdminLoggedIn ? 'Logout' : 'Admin'}
        </button>
      )}
    </nav>
  )
}

export default HeaderNav
