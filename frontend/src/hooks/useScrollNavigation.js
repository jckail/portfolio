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

  const performScroll = useCallback((hash) => {
    const targetElement = document.getElementById(hash);
    if (targetElement) {
      // Wait for next frame to ensure all layout calculations are complete
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        updateSection(hash, true);
      });
    }
  }, [headerHeight, updateSection]);

  const handleInitialScroll = useCallback(() => {
    if (!initialScrollPerformed.current) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        // Ensure header height is available
        if (headerHeight > 0) {
          performScroll(hash);
        } else {
          // If header height isn't ready, wait a bit and try again
          setTimeout(() => performScroll(hash), 100);
        }
      }
      initialScrollPerformed.current = true;
      initialScrollDone.current = true;
    }
  }, [headerHeight, performScroll]);

  useEffect(() => {
    const cleanupObserver = setupObserver(sectionsRef);
    window.addEventListener('scroll', debouncedUpdateSection, { passive: true });

    // Handle direct URL navigation
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        initialScrollPerformed.current = false;
        handleInitialScroll();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cleanupObserver();
      window.removeEventListener('scroll', debouncedUpdateSection);
      window.removeEventListener('hashchange', handleHashChange);
      cleanupUrl();
    };
  }, [headerHeight, debouncedUpdateSection, setupObserver, cleanupUrl, handleInitialScroll]);

  useEffect(() => {
    if (resumeData && headerHeight > 0 && !initialScrollPerformed.current) {
      handleInitialScroll();
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};
