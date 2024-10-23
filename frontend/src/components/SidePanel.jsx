import React from 'react'

function SidePanel({ isOpen, currentSection, onClose, isTemporarilyVisible }) {
  return (
    <div className={`side-panel ${isOpen || isTemporarilyVisible ? 'open' : ''}`} >
      <div className="side-panel-content">
        <h3>🔍</h3>
        <nav>
          <a 
            href="#about-me" 
            className={currentSection === 'about-me' ? 'active' : ''}
          >
            About Me
          </a>
          <a 
            href="#technical-skills" 
            className={currentSection === 'technical-skills' ? 'active' : ''}
          >
            Technical Skills
          </a>
          <a 
            href="#experience" 
            className={currentSection === 'experience' ? 'active' : ''}
          >
            Experience
          </a>
          <a 
            href="#projects" 
            className={currentSection === 'projects' ? 'active' : ''}
          >
            Projects
          </a>
          <a 
            href="#my-resume" 
            className={currentSection === 'my-resume' ? 'active' : ''}
          >
            My Resume
          </a>
        </nav>
      </div>
    </div>
  )
}

export default SidePanel
