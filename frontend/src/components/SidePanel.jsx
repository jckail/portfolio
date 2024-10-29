import React from 'react'
import { useAppLogic } from './AppLogicProvider'

function SidePanel({ currentSection, handleSectionClick }) {
  const { isSidebarOpen, isTemporarilyVisible, toggleSidebar } = useAppLogic();

  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    handleSectionClick(targetId);
    toggleSidebar();
  };

  return (
    <div className={`side-panel ${isSidebarOpen || isTemporarilyVisible ? 'open' : ''}`}>
      <div className="side-panel-content">
        <h3>🔍</h3>
        <nav>
          <a 
            href="#about-me" 
            onClick={(e) => handleNavClick(e, 'about-me')}
            className={currentSection.id === 'about-me' ? 'active' : ''}
          >
            About Me
          </a>
          <a 
            href="#technical-skills" 
            onClick={(e) => handleNavClick(e, 'technical-skills')}
            className={currentSection.id === 'technical-skills' ? 'active' : ''}
          >
            Technical Skills
          </a>
          <a 
            href="#experience" 
            onClick={(e) => handleNavClick(e, 'experience')}
            className={currentSection.id === 'experience' ? 'active' : ''}
          >
            Experience
          </a>
          <a 
            href="#projects" 
            onClick={(e) => handleNavClick(e, 'projects')}
            className={currentSection.id === 'projects' ? 'active' : ''}
          >
            Projects
          </a>
          <a 
            href="#my-resume" 
            onClick={(e) => handleNavClick(e, 'my-resume')}
            className={currentSection.id === 'my-resume' ? 'active' : ''}
          >
            My Resume
          </a>
        </nav>
      </div>
    </div>
  );
}

export default SidePanel
