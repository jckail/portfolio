import React from 'react'
import PropTypes from 'prop-types'

/**
 * SidePanel component that displays navigation links for different sections of the resume.
 */
function SidePanel({ isOpen, currentSection, headerHeight, onClose, isTemporarilyVisible }) {
  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      // Update URL hash
      window.history.pushState(null, '', `#${targetId}`);
    }
    onClose();
  };

  const navItems = [
    { id: 'technical-skills', label: 'Technical Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'my-resume', label: 'My Resume' },
  ];

  return (
    <div className={`side-panel ${isOpen || isTemporarilyVisible ? 'open' : ''}`} style={{ paddingTop: `${headerHeight}px` }}>
      <div className="side-panel-content">
        <h3>🔍</h3>
        <nav>
          {navItems.map(({ id, label }) => (
            <a 
              key={id}
              href={`#${id}`}
              onClick={(e) => handleNavClick(e, id)}
              className={currentSection === id ? 'active' : ''}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

SidePanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  currentSection: PropTypes.string.isRequired,
  headerHeight: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  isTemporarilyVisible: PropTypes.bool.isRequired,
}

export default SidePanel
