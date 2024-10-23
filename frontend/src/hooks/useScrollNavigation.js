import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useSectionTracking } from './useSectionTracking';
import { useScrollBehavior } from './useScrollBehavior';

export const useScrollNavigation = (resumeData, headerHeight, onSectionChange) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const initialScrollPerformed = useRef(false);
  
  const { trackSection } = useSectionTracking();

  const updateSection = useCallback((newSectionId) => {
    if (newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      trackSection(newSectionId);
      // Let useAppLogic handle URL updates
      onSectionChange(newSectionId);
    }
  }, [currentSection, trackSection, onSectionChange]);

  const { setupObserver } = useIntersectionObserver(headerHeight, updateSection);
  const { updateSectionOnScroll, scrollToSection } = useScrollBehavior(
    headerHeight,
    currentSection,
    updateSection,
    sectionsRef
  );

  const performScroll = useCallback((hash) => {
    const targetElement = document.getElementById(hash);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        updateSection(hash);
      });
    }
  }, [headerHeight, updateSection]);

  const handleInitialScroll = useCallback(() => {
    if (!initialScrollPerformed.current) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        if (headerHeight > 0) {
          performScroll(hash);
        } else {
          () => performScroll(hash);
        }
      }
      initialScrollPerformed.current = true;
    }
  }, [headerHeight, performScroll]);

  useEffect(() => {
    const cleanupObserver = setupObserver(sectionsRef);
    window.addEventListener('scroll', updateSectionOnScroll, { passive: true });

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
      window.removeEventListener('scroll', updateSectionOnScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [headerHeight, updateSectionOnScroll, setupObserver, handleInitialScroll]);

  useEffect(() => {
    if (resumeData && headerHeight > 0 && !initialScrollPerformed.current) {
      handleInitialScroll();
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};