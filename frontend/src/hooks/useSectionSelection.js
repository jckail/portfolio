import { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useDirectPageLoad } from './useDirectPageLoad';
import { debounce } from 'lodash';

// Use the same offset as defined in HeaderNav
const SCROLL_OFFSET = 65;

export const useSectionSelection = (headerHeight, onSectionChange) => {
  // Use direct page load hook
  const { initialSection, handleDirectPageLoad, isFirstVisit } = useDirectPageLoad(headerHeight, onSectionChange);
  const [currentSection, setCurrentSection] = useState(initialSection);
  
  // Refs for sections and initialization tracking
  const sectionsRef = useRef({});
  const observerPaused = useRef(false);

  // Log header height when it changes
  useEffect(() => {
    console.log('\n--- Section Selection Header Height ---');
    console.log(`Current Header Height: ${headerHeight}px`);
    console.log('------------------------\n');
  }, [headerHeight]);

  // Central section update handler with logging
  const handleSectionUpdate = useCallback((newSectionId, source) => {
    if (newSectionId && newSectionId !== currentSection) {
      // Log section updates except when source is intersection and observer is paused
      if (!(source === 'intersection' && observerPaused.current)) {
        console.log('\n--- Section Selection Update ---');
        console.log(`Previous Section: ${currentSection}`);
        console.log(`New Section: ${newSectionId}`);
        console.log(`Update Source: ${source}`);
        console.log(`Header Height: ${headerHeight}px`);
        console.log(`Observer Paused: ${observerPaused.current}`);
        console.log(`First Visit: ${isFirstVisit}`);
      }
      
      // Only allow intersection updates if observer is not paused
      if (source === 'intersection' && observerPaused.current) {
        return;
      }

      if (source === 'intersection') {
        const viewportHeight = window.innerHeight;
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + viewportHeight;
        
        console.log('\nViewport Information:');
        console.log(`Viewport Height: ${viewportHeight}px`);
        console.log(`Viewport Range: ${Math.round(viewportTop)}px - ${Math.round(viewportBottom)}px`);
        
        console.log('\nSection Positions:');
        Object.entries(sectionsRef.current).forEach(([id, element]) => {
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const elementBottom = rect.bottom + window.scrollY;
            const isVisible = elementTop < viewportBottom && elementBottom > viewportTop;
            
            console.log(`${id}:`, {
              top: Math.round(elementTop),
              bottom: Math.round(elementBottom),
              visible: isVisible ? 'Yes' : 'No',
              active: id === newSectionId ? 'Yes' : 'No'
            });
          }
        });
      }
      console.log('------------------------\n');

      setCurrentSection(newSectionId);
      onSectionChange(newSectionId, source);
    }
  }, [currentSection, headerHeight, onSectionChange, isFirstVisit]);

  // Create debounced version for intersection updates
  const debouncedHandleSectionUpdate = useCallback(
    debounce((newSectionId, source) => handleSectionUpdate(newSectionId, source), 150),
    [handleSectionUpdate]
  );

  // Setup intersection observer for viewport detection
  const { setupObserver } = useIntersectionObserver(
    headerHeight,
    (newSection) => {
      if (newSection) {
        debouncedHandleSectionUpdate(newSection, 'intersection');
      }
    }
  );

  // Scroll to section function
  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      });
    }
  }, []);

  // Navigation click handler
  const handleNavigationClick = useCallback((sectionId) => {
    console.log('\n--- Navigation Click ---');
    console.log(`Target Section: ${sectionId}`);
    console.log(`Header Height: ${headerHeight}px`);
    console.log('------------------------\n');
    
    // Pause observer before any scroll action
    observerPaused.current = true;
    handleSectionUpdate(sectionId, 'navigation');
    scrollToSection(sectionId);
  }, [scrollToSection, handleSectionUpdate, headerHeight]);

  // Button click handler (e.g., "See My Resume")
  const handleButtonClick = useCallback((sectionId) => {
    console.log('\n--- Button Click ---');
    console.log(`Target Section: ${sectionId}`);
    console.log(`Header Height: ${headerHeight}px`);
    console.log('------------------------\n');
    
    // Pause observer before any scroll action
    observerPaused.current = true;
    handleSectionUpdate(sectionId, 'button');
    scrollToSection(sectionId);
  }, [scrollToSection, handleSectionUpdate, headerHeight]);

  // Resume observer after animation ends
  useEffect(() => {
    const handleScrollEnd = () => {
      if (observerPaused.current) {
        console.log('\n--- Scroll Animation End ---');
        console.log('Resuming intersection observer');
        console.log(`Header Height: ${headerHeight}px`);
        console.log('------------------------\n');
        observerPaused.current = false;
      }
    };

    // Listen for the end of smooth scroll
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollEnd, 150); // Adjust timeout as needed
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      // Cancel any pending debounced calls
      debouncedHandleSectionUpdate.cancel();
    };
  }, [headerHeight, debouncedHandleSectionUpdate]);

  // Setup observer when header height changes
  useEffect(() => {
    if (headerHeight > 0) {
      const cleanupObserver = setupObserver(sectionsRef);
      return cleanupObserver;
    }
  }, [headerHeight, setupObserver]);

  // Handle direct page load
  useEffect(() => {
    handleDirectPageLoad(sectionsRef);
  }, [handleDirectPageLoad]);

  return {
    currentSection,
    sectionsRef,
    handleNavigationClick,
    handleButtonClick
  };
};
