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
  const lastUrlState = useRef<string | null>(null);

  useEffect(() => {
    debugLog('ScrollSpy hook initialized');

    // Function to update URL and store based on section ID without scrolling
    const updateURL = (id: string) => {
      debugLog('Updating URL', { section: id });
      
      // Only proceed if the section has actually changed
      if (lastTrackedSection.current === id) {
        debugLog('Section unchanged, skipping URL update', { section: id });
        return;
      }

      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const newHash = `${currentPath}${currentSearch}#${id}`;
      
      // Only update if the URL has actually changed
      if (newHash !== lastUrlState.current) {
        debugLog('URL changed, updating state', { 
          from: lastUrlState.current, 
          to: newHash 
        });
        
        // Track anchor change if different from last tracked
        if (lastAnchor.current !== id) {
          trackAnchorChange(id, lastAnchor.current);
          lastAnchor.current = id;
        }
        
        lastUrlState.current = newHash;
        window.history.replaceState({}, '', newHash);
        setCurrentSection(id);
      } else {
        debugLog('URL unchanged, skipping update', { url: newHash });
      }
    };

    // Debounced analytics tracking to prevent excessive events
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

      // Update URL and track analytics if we found a section
      if (currentSection?.id) {
        debugLog('Found current section', { id: currentSection.id });
        updateURL(currentSection.id);
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
          }, 100); // Small delay to ensure scrollIntoView has completed
        } else if (targetSection) {
          // Just update the URL and store without scrolling
          debugLog('Updating URL without scrolling', { id: targetId });
          updateURL(targetId);
          debouncedTrackSection(targetId);
        }
      } else {
        debugLog('No hash found, defaulting to about section');
        updateURL('about');
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
