import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);

  const updateSection = (newSectionId) => {
    if (newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        window.history.replaceState(null, '', `#${newSectionId}`);
      }, 1000);
    }
  };

  const handleIntersection = useCallback((entries) => {
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
  }, [currentSection]);

  const updateUrlOnScroll = useCallback(() => {
    const scrollPosition = window.scrollY + headerHeight + 150;

    const newSectionId = Object.entries(sectionsRef.current)
      .reverse()
      .find(([_, element]) => element?.offsetTop <= scrollPosition)?.[0] 
      || currentSection;

    updateSection(newSectionId);
  }, [currentSection, headerHeight]);

  const debouncedUpdateUrlOnScroll = useCallback(
    debounce(updateUrlOnScroll, 100),
    [updateUrlOnScroll]
  );

  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeight}px 0px -45% 0px`,
        threshold: [0.1, 0.5, 1],
      });
    }

    const observer = observerRef.current;
    Object.values(sectionsRef.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    window.addEventListener('scroll', debouncedUpdateUrlOnScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', debouncedUpdateUrlOnScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [headerHeight, handleIntersection, debouncedUpdateUrlOnScroll]);

  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      setCurrentSection(sectionId);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        window.history.pushState(null, '', `#${sectionId}`);
      }, 1000);
    }
  }, [headerHeight]);

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
