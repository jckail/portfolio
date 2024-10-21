import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const [sectionsReady, setSectionsReady] = useState(false);
  const observerRef = useRef(null);
  const urlUpdateTimeoutRef = useRef(null);

  const updateSection = useCallback(
    (newSectionId) => {
      if (newSectionId !== currentSection) {
        setCurrentSection(newSectionId);

        if (urlUpdateTimeoutRef.current) {
          clearTimeout(urlUpdateTimeoutRef.current);
        }

        urlUpdateTimeoutRef.current = setTimeout(() => {
          window.history.replaceState(null, '', `#${newSectionId}`);
          urlUpdateTimeoutRef.current = null;
        }, 5);
      }
    },
    [currentSection]
  );

  const handleIntersection = useCallback(
    (entries) => {
      let mostVisibleEntry = null;

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
    },
    [updateSection]
  );

  // Set sectionsReady when sectionsRef is populated
  useEffect(() => {
    if (Object.keys(sectionsRef.current).length > 0) {
      setSectionsReady(true);
    }
  }, [sectionsRef.current]);

  useEffect(() => {
    if (!sectionsReady) return;

    const initializeObserver = () => {
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(handleIntersection, {
          rootMargin: `-${headerHeight}px 0px -40% 0px`,
          threshold: [0.1, 0.25, 0.5, 0.75],
        });
      }

      const observer = observerRef.current;
      Object.values(sectionsRef.current).forEach((section) => {
        if (section) {
          observer.observe(section);
        }
      });
    };

    initializeObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [headerHeight, handleIntersection, sectionsReady]);

  const scrollToSection = useCallback(
    (sectionId) => {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        const targetPosition =
          targetElement.getBoundingClientRect().top +
          window.pageYOffset -
          headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        setCurrentSection(sectionId);
        window.history.pushState(null, '', `#${sectionId}`);
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
    if (resumeData && headerHeight > 0 && sectionsReady) {
      setTimeout(handleInitialScroll, 100);
    }
  }, [resumeData, headerHeight, handleInitialScroll, sectionsReady]);

  return { currentSection, sectionsRef, scrollToSection };
};
