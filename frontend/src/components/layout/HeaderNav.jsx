import React from 'react'

function HeaderNav({ resumeData, theme, onResumeClick }) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return (
    <nav className="header-nav">
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
