import { useRef, useCallback, useEffect } from 'react';

// Use the same offset as defined in HeaderNav
const SCROLL_OFFSET = 65;

// Valid sections that can be loaded
const VALID_SECTIONS = [
  'about-me',
  'technical-skills',
  'experience',
  'projects',
  'my-resume'
];

export const useDirectPageLoad = (headerHeight, onSectionChange) => {
  const initialLoadPerformed = useRef(false);
  const isFirstVisit = useRef(localStorage.getItem('hasVisitedBefore') !== 'true');

  // Get and validate section from URL hash
  const getValidSection = useCallback(() => {
    const hashSection = window.location.hash.slice(1);
    return VALID_SECTIONS.includes(hashSection) ? hashSection : '';
  }, []);

  // Scroll to section function for initial load
  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
        window.scrollTo({
          top: targetPosition,
          behavior: isFirstVisit.current ? 'auto' : 'smooth'
        });
      });
    }
  }, []);

  // Handle direct page load section
  const handleDirectPageLoad = useCallback((sectionsRef) => {
    if (!initialLoadPerformed.current && headerHeight > 0) {
      const section = getValidSection();
      const isRefresh = performance.navigation.type === 1;
      const isDirectUrl = !isRefresh && window.location.hash;
      
      console.log('\n--- Direct Page Load ---');
      console.log(`Load Type: ${isFirstVisit.current ? 'First Visit' : isRefresh ? 'Page Refresh' : isDirectUrl ? 'Direct URL' : 'Normal Navigation'}`);
      console.log(`Target Section: ${section}`);
      console.log(`Header Height: ${headerHeight}px`);
      console.log(`Section Exists: ${Boolean(sectionsRef.current[section])}`);
      console.log('------------------------\n');

      // Only scroll if section exists and is valid
      if (section && sectionsRef.current[section]) {
        onSectionChange(section, 'direct-load');
        
        // For first visits, wait a bit to ensure content is loaded
        if (isFirstVisit.current) {
          setTimeout(() => {
            scrollToSection(section);
            // Mark as visited after first load
            localStorage.setItem('hasVisitedBefore', 'true');
          }, 100);
        } else {
          scrollToSection(section);
        }
      } else if (section) {
        console.warn(`Invalid section "${section}" in URL hash`);
        // If section is invalid, keep the current URL without changing it
      }

      initialLoadPerformed.current = true;
    }
  }, [headerHeight, onSectionChange, scrollToSection, getValidSection]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (initialLoadPerformed.current) {
        const section = getValidSection();
        console.log('\n--- Browser Navigation ---');
        console.log(`Navigating to section: ${section}`);
        console.log('------------------------\n');
        
        if (section) {
          onSectionChange(section, 'browser-navigation');
          scrollToSection(section);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getValidSection, onSectionChange, scrollToSection]);

  return {
    initialSection: getValidSection(),
    handleDirectPageLoad,
    isFirstVisit: isFirstVisit.current
  };
};
