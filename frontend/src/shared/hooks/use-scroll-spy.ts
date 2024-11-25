import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSectionStore } from '../stores/section-store';
import { trackSectionView, trackAnchorChange } from '../utils/analytics';

const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[ScrollSpy] ${message}`, data ? JSON.stringify(data) : '');
  }
};

// Debounce helper
const debounce = (fn: Function, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    debugLog('Debounce called', { args });
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      debugLog('Debounce timeout fired', { args });
      fn.apply(null, args);
    }, ms);
  };
};

export const useScrollSpy = () => {
  const location = useLocation();
  const setCurrentSection = useSectionStore((state) => state.setCurrentSection);
  const lastTrackedSection = useRef<string>('');
  const lastAnchor = useRef<string>('');
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    debugLog('ScrollSpy hook initialized');

    // Debounced URL update function
    const debouncedUpdateURL = debounce((id: string) => {
      debugLog('Updating URL', { section: id });
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const newHash = `${currentPath}${currentSearch}#${id}`;
      
      // Track anchor change if different from last tracked
      if (lastAnchor.current !== id) {
        trackAnchorChange(id, lastAnchor.current);
        lastAnchor.current = id;
      }
      
      // Use replaceState to avoid adding new history entries
      window.history.replaceState({}, '', newHash);
      setCurrentSection(id);
    }, 200); // Debounce URL updates by 200ms

    // Debounced analytics tracking
    const debouncedTrackSection = debounce((sectionId: string) => {
      debugLog('Tracking section view', { 
        section: sectionId,
        previousSection: lastTrackedSection.current 
      });
      
      if (lastTrackedSection.current !== sectionId) {
        debugLog('Section changed', {
          from: lastTrackedSection.current,
          to: sectionId
        });
        trackSectionView(sectionId);
        lastTrackedSection.current = sectionId;
      } else {
        debugLog('Section unchanged', { section: sectionId });
      }
    }, 500);

    // Function to handle scroll events with rate limiting
    const handleScroll = () => {
      const now = Date.now();
      // Limit updates to once every 50ms
      if (now - lastUpdateTime.current < 50) {
        return;
      }
      lastUpdateTime.current = now;

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

      // Update URL and track analytics if we found a section
      if (currentSection?.id) {
        debugLog('Found current section', { id: currentSection.id });
        debouncedUpdateURL(currentSection.id);
        debouncedTrackSection(currentSection.id);
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
      debugLog('Handling initial scroll');
      if (location.hash) {
        const targetId = location.hash.slice(1); // Remove the # from the hash
        const targetSection = document.getElementById(targetId);
        debugLog('Initial hash section', { id: targetId });
        
        // Track initial anchor
        trackAnchorChange(targetId, null);
        lastAnchor.current = targetId;
        
        // Only scroll if it's a page load/refresh or resume button click
        const isInitialLoad = !window.performance.getEntriesByType('navigation')[0].toJSON().type.includes('navigate');
        const isResumeClick = location.state?.fromResumeButton;
        
        if (targetSection && (isInitialLoad || isResumeClick)) {
          debugLog('Scrolling to target section', { id: targetId });
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
          }, 200); // Small delay to ensure scrollIntoView has completed
        } else if (targetSection) {
          // Just update the URL and store without scrolling
          debugLog('Updating URL without scrolling', { id: targetId });
          debouncedUpdateURL(targetId);
          debouncedTrackSection(targetId);
        }
      } else {
        debugLog('No hash found, defaulting to about section');
        debouncedUpdateURL('about');
        debouncedTrackSection('about');
      }
    };

    // Handle initial scroll after DOM is ready
    if (document.readyState === 'complete') {
      handleInitialScroll();
    } else {
      window.addEventListener('load', handleInitialScroll);
    }

    return () => {
      debugLog('Cleaning up scroll spy');
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('load', handleInitialScroll);
    };
  }, [location, setCurrentSection]);
};
