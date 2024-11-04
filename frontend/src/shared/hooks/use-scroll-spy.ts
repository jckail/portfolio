import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollSpy = () => {
  const location = useLocation();

  useEffect(() => {
    // Function to update URL based on section ID
    const updateURL = (id: string) => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      window.history.replaceState({}, '', `${currentPath}${currentSearch}#${id}`);
    };

    // Function to handle scroll events
    const handleScroll = () => {
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      let currentSection: HTMLElement | null = null;
      let minDistance = Infinity;

      // Find the section closest to the top of the viewport
      sections.forEach((section) => {
        if (section.id) {  // Type guard to ensure id exists
          const rect = section.getBoundingClientRect();
          const distance = Math.abs(rect.top);
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = section;
          }
        }
      });

      // Update URL if we found a section
      if (currentSection && currentSection.id) {
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
        
        if (targetSection) {
          // First scroll to bring the element into view
          targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          
          // Then adjust for header height
          const headerOffset = 80;
          setTimeout(() => {
            const elementPosition = targetSection.getBoundingClientRect().top;
            const offsetPosition = window.scrollY + elementPosition - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }, 100); // Small delay to ensure scrollIntoView has completed
        }
      } else {
        updateURL('about');
      }
    };

    // Create a MutationObserver to watch for content changes
    const observer = new MutationObserver(() => {
      if (location.hash) {
        handleInitialScroll();
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Handle initial scroll after DOM is ready
    if (document.readyState === 'complete') {
      handleInitialScroll();
    } else {
      window.addEventListener('load', handleInitialScroll);
    }

    return () => {
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('load', handleInitialScroll);
      observer.disconnect();
    };
  }, [location]);
};
