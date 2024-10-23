import { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

export const useSectionSelection = (headerHeight, onSectionChange) => {
  // State for tracking current section
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  
  // Refs for sections and initialization tracking
  const sectionsRef = useRef({});
  const initialScrollPerformed = useRef(false);
  const observerPaused = useRef(false);

  // Central section update handler with logging
  const handleSectionUpdate = useCallback((newSectionId, source) => {
    if (newSectionId && newSectionId !== currentSection) {
      console.log('\n--- Section Selection Update ---');
      console.log(`Previous Section: ${currentSection}`);
      console.log(`New Section: ${newSectionId}`);
      console.log(`Update Source: ${source}`);
      console.log(`Header Height: ${headerHeight}px`);
      console.log(`Observer Paused: ${observerPaused.current}`);
      
      // Only allow intersection updates if observer is not paused
      if (source === 'intersection' && observerPaused.current) {
        console.log('Intersection update ignored - observer paused');
        console.log('------------------------\n');
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
  }, [currentSection, headerHeight, onSectionChange]);

  // Setup intersection observer for viewport detection
  const { setupObserver } = useIntersectionObserver(
    headerHeight,
    (newSection) => handleSectionUpdate(newSection, 'intersection')
  );

  // Scroll to section function
  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        handleSectionUpdate(sectionId, 'navigation');
      });
    }
  }, [headerHeight, handleSectionUpdate]);

  // Handle initial URL-based section
  const handleInitialSection = useCallback(() => {
    if (!initialScrollPerformed.current) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        console.log('\n--- Initial Section Load ---');
        console.log(`Loading section from URL hash: ${hash}`);
        console.log('------------------------\n');
        
        observerPaused.current = true;
        scrollToSection(hash);
        handleSectionUpdate(hash, 'url');
      }
      initialScrollPerformed.current = true;
    }
  }, [scrollToSection, handleSectionUpdate]);

  // Navigation click handler
  const handleNavigationClick = useCallback((sectionId) => {
    console.log('\n--- Navigation Click ---');
    console.log(`Target Section: ${sectionId}`);
    console.log('------------------------\n');
    
    observerPaused.current = true;
    scrollToSection(sectionId);
    handleSectionUpdate(sectionId, 'navigation');
  }, [scrollToSection, handleSectionUpdate]);

  // Button click handler (e.g., "See My Resume")
  const handleButtonClick = useCallback((sectionId) => {
    console.log('\n--- Button Click ---');
    console.log(`Target Section: ${sectionId}`);
    console.log('------------------------\n');
    
    observerPaused.current = true;
    scrollToSection(sectionId);
    handleSectionUpdate(sectionId, 'button');
  }, [scrollToSection, handleSectionUpdate]);

  // Setup event listeners
  useEffect(() => {
    const cleanupObserver = setupObserver(sectionsRef);

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        console.log('\n--- URL Hash Change ---');
        console.log(`New Hash: ${hash}`);
        console.log('------------------------\n');
        
        observerPaused.current = true;
        initialScrollPerformed.current = false;
        handleInitialSection();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cleanupObserver();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [
    headerHeight,
    setupObserver,
    handleInitialSection
  ]);

  // Handle initial section on mount
  useEffect(() => {
    if (headerHeight > 0 && !initialScrollPerformed.current) {
      handleInitialSection();
    }
  }, [headerHeight, handleInitialSection]);

  return {
    currentSection,
    sectionsRef,
    handleNavigationClick,
    handleButtonClick
  };
};
