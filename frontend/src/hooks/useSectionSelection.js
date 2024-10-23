import { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useScrollBehavior } from './useScrollBehavior';
import { useUrlManagement } from './useUrlManagement';

export const useSectionSelection = (headerHeight) => {
  // State for tracking current section
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  
  // Refs for sections and initialization tracking
  const sectionsRef = useRef({});
  const initialScrollPerformed = useRef(false);

  // URL management
  const { updateUrl, initialScrollDone } = useUrlManagement();

  // Central section update handler
  const handleSectionUpdate = useCallback((newSectionId, source) => {
    if (newSectionId && newSectionId !== currentSection) {
      console.log(`Section update from ${source}:`, newSectionId);
      setCurrentSection(newSectionId);
      
      // Update URL (push state for user actions, replace for scroll/intersection)
      const shouldPushState = source === 'navigation' || source === 'button';
      updateUrl(newSectionId, shouldPushState);
      
      // Mark initial scroll as done after first update
      initialScrollDone.current = true;
    }
  }, [currentSection, updateUrl]);

  // Setup intersection observer for viewport detection
  const { setupObserver } = useIntersectionObserver(
    headerHeight,
    (newSection) => handleSectionUpdate(newSection, 'intersection')
  );

  // Setup scroll behavior
  const { debouncedUpdateSection, scrollToSection } = useScrollBehavior(
    headerHeight,
    currentSection,
    (newSection) => handleSectionUpdate(newSection, 'scroll'),
    sectionsRef
  );

  // Handle initial URL-based section
  const handleInitialSection = useCallback(() => {
    if (!initialScrollPerformed.current) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        scrollToSection(hash);
        handleSectionUpdate(hash, 'url');
      }
      initialScrollPerformed.current = true;
    }
  }, [scrollToSection, handleSectionUpdate]);

  // Navigation click handler
  const handleNavigationClick = useCallback((sectionId) => {
    scrollToSection(sectionId);
    handleSectionUpdate(sectionId, 'navigation');
  }, [scrollToSection, handleSectionUpdate]);

  // Button click handler (e.g., "See My Resume")
  const handleButtonClick = useCallback((sectionId) => {
    scrollToSection(sectionId);
    handleSectionUpdate(sectionId, 'button');
  }, [scrollToSection, handleSectionUpdate]);

  // Setup event listeners
  useEffect(() => {
    const cleanupObserver = setupObserver(sectionsRef);
    window.addEventListener('scroll', debouncedUpdateSection, { passive: true });

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        initialScrollPerformed.current = false;
        handleInitialSection();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cleanupObserver();
      window.removeEventListener('scroll', debouncedUpdateSection);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [
    headerHeight,
    debouncedUpdateSection,
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
