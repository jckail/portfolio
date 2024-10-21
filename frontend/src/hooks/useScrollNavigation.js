import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const observerRef = useRef(null);

  const updateSection = (newSectionId) => {
    if (newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      window.history.replaceState(null, '', `#${newSectionId}`);
    }
  };

  const handleIntersection = useCallback((entries) => {
    let mostVisibleEntry = null;

    // Find the entry with the highest intersection ratio.
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (
          !mostVisibleEntry ||
          entry.intersectionRatio > mostVisibleEntry.intersectionRatio
        ) {
          mostVisibleEntry = entry;
        }
      }
    });

    if (mostVisibleEntry) {
      updateSection(mostVisibleEntry.target.id);
    }
  }, [currentSection]);

  const updateUrlOnScroll = useCallback(() => {
    const scrollPosition = window.scrollY + headerHeight + 50;

    const newSectionId = Object.entries(sectionsRef.current)
      .reverse() // Reverse for the last visible section
      .find(([_, element]) => element?.offsetTop <= scrollPosition)?.[0] 
      || currentSection;

    updateSection(newSectionId);
  }, [currentSection, headerHeight]);

  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeight}px 0px -45% 0px`, // Adjusted for better visibility tracking
        threshold: [0.1, 0.5, 1], // Adjusted to fire more consistently
      });
    }

    const observer = observerRef.current;
    Object.values(sectionsRef.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    window.addEventListener('scroll', updateUrlOnScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateUrlOnScroll);
    };
  }, [headerHeight, handleIntersection, updateUrlOnScroll]);

  const scrollToSection = useCallback(
    (sectionId) => {
      const targetElement = sectionsRef.current[sectionId];
      if (targetElement) {
        requestAnimationFrame(() => {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
        updateSection(sectionId);
      }
    },
    [headerHeight]
  );

  const handleInitialScroll = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sectionsRef.current[hash]) {
      scrollToSection(hash);
    }
  }, [scrollToSection]);

  useEffect(() => {
    if (resumeData && headerHeight > 0) {
      setTimeout(handleInitialScroll, 100);
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};
