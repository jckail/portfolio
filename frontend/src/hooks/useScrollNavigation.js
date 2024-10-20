import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState('about-me');
  const sectionsRef = useRef({});

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    let newCurrentSection = 'about-me';

    Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
      if (sectionRef && scrollPosition >= sectionRef.offsetTop - headerHeight - 10) {
        newCurrentSection = sectionId;
      }
    });

    if (newCurrentSection !== currentSection) {
      setCurrentSection(newCurrentSection);
      window.history.replaceState(null, '', `#${newCurrentSection}`);
    }
  }, [headerHeight, currentSection]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const scrollToSection = useCallback((sectionId, headerHeight, updateUrl = true) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      if (updateUrl) {
        window.history.pushState(null, '', `#${sectionId}`);
      }
      setCurrentSection(sectionId);
    }
  }, []);

  const handleInitialScroll = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sectionsRef.current[hash] && headerHeight > 0) {
      setTimeout(() => {
        scrollToSection(hash, headerHeight, false);
      }, 100);
    }
  }, [headerHeight, scrollToSection]);

  useEffect(() => {
    if (resumeData && headerHeight > 0) {
      handleInitialScroll();
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};
