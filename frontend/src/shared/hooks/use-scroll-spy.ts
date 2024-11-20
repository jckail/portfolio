import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSectionStore } from '../stores/section-store';

export const useScrollSpy = () => {
  const location = useLocation();
  const setCurrentSection = useSectionStore((state) => state.setCurrentSection);

  useEffect(() => {
    // Function to update URL and store based on section ID without scrolling
    const updateURL = (id: string) => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      window.history.replaceState({}, '', `${currentPath}${currentSearch}#${id}`);
      setCurrentSection(id);
    };

    // Function to handle scroll events
    const handleScroll = () => {
      const nodeList = document.querySelectorAll<HTMLElement>('section[id]');
      const sections = Array.from<HTMLElement>(nodeList);
      let currentSection: HTMLElement | null = null;
      let minDistance = Infinity;

      // Find the section closest to the top of the viewport
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top);
        if (distance < minDistance) {
          minDistance = distance;
          currentSection = section;
        }
      }

      // Update URL if we found a section
      if (currentSection?.id) {
        updateURL(currentSection.id);
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

    // Function to handle initial scroll
    const handleInitialScroll = () => {
      if (location.hash) {
        const targetId = location.hash.slice(1); // Remove the # from the hash
        const targetSection = document.getElementById(targetId);
        
        // Only scroll if it's a page load/refresh or resume button click
        const isInitialLoad = !window.performance.getEntriesByType('navigation')[0].toJSON().type.includes('navigate');
        const isResumeClick = location.state?.fromResumeButton;
        
        if (targetSection && (isInitialLoad || isResumeClick)) {
          // Get the header height from CSS variable
            const headerHeight = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--header-height')
            .trim()
            .replace('px', '')) + 5;

          // First scroll to bring the element into view
          targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Then adjust for header height
          setTimeout(() => {
            const elementPosition = targetSection.getBoundingClientRect().top;
            const offsetPosition = window.scrollY + elementPosition - headerHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }, 100); // Small delay to ensure scrollIntoView has completed
        } else if (targetSection) {
          // Just update the URL and store without scrolling
          updateURL(targetId);
        }
      } else {
        updateURL('about');
      }
    };

    // Handle initial scroll after DOM is ready
    if (document.readyState === 'complete') {
      handleInitialScroll();
    } else {
      window.addEventListener('load', handleInitialScroll);
    }

    return () => {
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('load', handleInitialScroll);
    };
  }, [location, setCurrentSection]);
};
