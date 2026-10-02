import React from 'react';

import { scrollToSection } from '../../utils/scroll-utils';
import { useFocusTrap } from '../../hooks/use-focus-trap';
import '../../../styles/components/navigation/side-panel.css';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** The control that opens the panel (the hamburger); focus returns to it on close. */
  returnFocusRef?: React.RefObject<HTMLElement>;
}

// Custom hook to get current section from URL and scroll position.
// Note: the app-wide useScrollSpy (owned by MainContent) handles URL updates
// and analytics; this hook only tracks the highlighted nav item locally.
const useCurrentSection = () => {
  const [currentSection, setCurrentSection] = React.useState('');

  React.useEffect(() => {
    const updateSection = () => {
      const hash = window.location.hash.slice(1);
      setCurrentSection(hash || 'about');
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

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, returnFocusRef }) => {
  const currentSection = useCurrentSection();
  // The drawer is modal while open: useFocusTrap keeps Tab inside it, closes it
  // on Escape, locks page scroll, focuses the first item, and restores focus on
  // close. The trap strips `inert` from its container when it tears down, so
  // the inert toggle below must be a passive effect declared after the hook:
  // all cleanups run before any effect, which lets it re-apply `inert` last.
  const navRef = useFocusTrap(isOpen, onClose) as unknown as React.MutableRefObject<HTMLElement | null>;
  const wasOpenRef = React.useRef(isOpen);

  // Closed, the drawer only slides off-screen; inert keeps its buttons out
  // of the tab order and the accessibility tree. (React 18 has no inert prop.)
  // On close, focus goes back to the opener unless the visitor has already
  // moved focus somewhere else on the page (the trap restores it in the common case).
  React.useEffect(() => {
    const nav = navRef.current;
    nav?.toggleAttribute('inert', !isOpen);
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!nav || wasOpen === isOpen || isOpen) return;
    const active = document.activeElement;
    if (!active || active === document.body || nav.contains(active)) {
      returnFocusRef?.current?.focus();
    }
  }, [isOpen, returnFocusRef, navRef]);

  const sections = [
    { id: 'about', label: 'About' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'resume', label: 'Resume' },
  ];

  const handleNavClick = (id: string) => {
    scrollToSection(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop: mouse-only dismiss affordance; keyboard users close via the nav buttons */}
      <div
        className={`side-panel-overlay ${isOpen ? 'active' : ''}`}
        role="presentation"
        onClick={onClose}
      />
      <nav
        ref={navRef}
        id="side-panel"
        aria-label="Sections"
        className={`side-panel ${isOpen ? 'open' : ''}`}
      >
        <div className="side-panel-content">
          {sections.map((section) => (
            <button
              key={section.id}
              aria-current={currentSection === section.id ? 'location' : undefined}
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
