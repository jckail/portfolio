import React from 'react';
import '../styles/side-panel.css';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const sections = [
    { id: 'about', label: 'About Me' },
    { id: 'skills', label: 'Technical Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'resume', label: 'My Resume' },
  ];

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

  return (
    <>
      <div className={`side-panel-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <nav className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="side-panel-content">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleNavClick(section.id)}
              className="nav-item"
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default SidePanel;
