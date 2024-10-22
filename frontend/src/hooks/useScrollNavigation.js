import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useUrlManagement } from './useUrlManagement';
import { useSectionTracking } from './useSectionTracking';
import { useScrollBehavior } from './useScrollBehavior';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const initialScrollPerformed = useRef(false);
  
  const { updateUrl, initialScrollDone, cleanup: cleanupUrl } = useUrlManagement();
  const { trackSection } = useSectionTracking();

  const updateSection = useCallback((newSectionId, isPush = false) => {
    if (newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      trackSection(newSectionId);
      updateUrl(newSectionId, isPush);
    }
  }, [currentSection, trackSection, updateUrl]);

  const { setupObserver } = useIntersectionObserver(headerHeight, updateSection);
  const { debouncedUpdateSection, scrollToSection } = useScrollBehavior(
    headerHeight,
    currentSection,
    updateSection,
    sectionsRef
  );

  const handleInitialScroll = useCallback(() => {
    if (!initialScrollPerformed.current) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        scrollToSection(hash);
      }
      initialScrollPerformed.current = true;
      initialScrollDone.current = true;
    }
  }, [scrollToSection]);

  useEffect(() => {
    const cleanupObserver = setupObserver(sectionsRef);
    window.addEventListener('scroll', debouncedUpdateSection, { passive: true });

    return () => {
      cleanupObserver();
      window.removeEventListener('scroll', debouncedUpdateSection);
      cleanupUrl();
    };
  }, [headerHeight, debouncedUpdateSection, setupObserver, cleanupUrl]);

  useEffect(() => {
    if (resumeData && headerHeight > 0 && !initialScrollPerformed.current) {
      // Small delay to ensure DOM is ready
      setTimeout(handleInitialScroll, 1);
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};
