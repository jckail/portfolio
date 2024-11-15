import React from 'react';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';
import '../styles/side-panel.css';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom hook to get current section from URL and scroll position
const useCurrentSection = () => {
  const [currentSection, setCurrentSection] = React.useState('');

  // Use scroll spy to update URL on scroll
  useScrollSpy();

  React.useEffect(() => {
    const updateSection = () => {
      const hash = window.location.hash.slice(1);
      setCurrentSection(hash || 'tldr');
    };

    // Set initial section
    updateSection();

    // Listen for hash changes (from both scroll spy and manual navigation)
    window.addEventListener('hashchange', updateSection);

    // Listen for scroll events to update immediately
    const handleScroll = () => {
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      let currentSectionId = '';
      let minDistance = Infinity;

      sections.forEach((section) => {
        if (section.id) {
          const rect = section.getBoundingClientRect();
          const distance = Math.abs(rect.top);
          if (distance < minDistance) {
            minDistance = distance;
            currentSectionId = section.id;
          }
        }
      });

      if (currentSectionId) {
        setCurrentSection(currentSectionId);
      }
    };

    // Add scroll event listener with throttling
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });

    return () => {
      window.removeEventListener('hashchange', updateSection);
      window.removeEventListener('scroll', scrollListener);
    };
  }, []);

  return currentSection;
};

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const currentSection = useCurrentSection();

  const sections = [
    { id: 'tldr', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    // { id: 'contact', label: 'Contact' },
    { id: 'resume', label: 'Resume' },
  ];

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Get the header height from CSS variable
      const headerHeight = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height')
        .trim()
        .replace('px', ''));

      // First scroll to bring the element into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Then adjust for header height
      setTimeout(() => {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = window.scrollY + elementPosition - headerHeight;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure scrollIntoView has completed

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
              className={`nav-item ${currentSection === section.id ? 'active' : ''}`}
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
