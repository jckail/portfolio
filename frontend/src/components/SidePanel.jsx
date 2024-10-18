import React, { useEffect } from 'react'

function SidePanel({ isOpen, currentSection, headerHeight, onClose, isTemporarilyVisible, scrollToSection }) {
  useEffect(() => {
    console.log('SidePanel received headerHeight:', headerHeight);
  }, [headerHeight]);

  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    console.log('Jumping to section:', targetId, 'with headerHeight:', headerHeight);
    scrollToSection(targetId, headerHeight);
    // Add a small delay before closing the sidebar
    setTimeout(() => {
      onClose();
    }, 10);
  };

  return (
    <div className={`side-panel ${isOpen || isTemporarilyVisible ? 'open' : ''}`} >
      <div className="side-panel-content">
        <h3>🔍</h3>
        <nav>
          <a 
            href="#about-me" 
            onClick={(e) => handleNavClick(e, 'about-me')}
            className={currentSection === 'about-me' ? 'active' : ''}
          >
            About Me
          </a>
          <a 
            href="#technical-skills" 
            onClick={(e) => handleNavClick(e, 'technical-skills')}
            className={currentSection === 'technical-skills' ? 'active' : ''}
          >
            Technical Skills
          </a>
          <a 
            href="#experience" 
            onClick={(e) => handleNavClick(e, 'experience')}
            className={currentSection === 'experience' ? 'active' : ''}
          >
            Experience
          </a>
          <a 
            href="#projects" 
            onClick={(e) => handleNavClick(e, 'projects')}
            className={currentSection === 'projects' ? 'active' : ''}
          >
            Projects
          </a>
          <a 
            href="#my-resume" 
            onClick={(e) => handleNavClick(e, 'my-resume')}
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
