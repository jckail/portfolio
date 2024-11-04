import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/side-panel.css';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidePanel = ({ isOpen, onClose }: SidePanelProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get current active section from URL hash
  const currentSection = location.hash.slice(1) || 'about-me';

  useEffect(() => {
    // Add/remove panel-open class to body
    if (isOpen) {
      document.body.classList.add('panel-open');
    } else {
      document.body.classList.remove('panel-open');
    }
    return () => {
      document.body.classList.remove('panel-open');
    };
  }, [isOpen]);

  const handleNavigation = (section: string) => {
    const currentParams = new URLSearchParams(location.search);
    currentParams.delete('menu');
    const newUrl = `${location.pathname}?${currentParams.toString()}#${section}`;
    navigate(newUrl);
    
    // Scroll to section with header offset
    const element = document.getElementById(section);
    if (element) {
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth'
      });
    }
    
    onClose();
  };

  return (
    <>
      {isOpen && <div className="side-panel-overlay" onClick={onClose} />}
      <div className={`side-panel ${isOpen ? 'open' : ''}`}>
        <nav className="side-panel-nav">
          <ul>
            <li>
              <button 
                onClick={() => handleNavigation('about-me')}
                className={currentSection === 'about-me' ? 'active' : ''}
              >
                About Me
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('technical-skills')}
                className={currentSection === 'technical-skills' ? 'active' : ''}
              >
                Technical Skills
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('experience')}
                className={currentSection === 'experience' ? 'active' : ''}
              >
                Experience
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('projects')}
                className={currentSection === 'projects' ? 'active' : ''}
              >
                Projects
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('my-resume')}
                className={currentSection === 'my-resume' ? 'active' : ''}
              >
                Get My Full Resume
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};
