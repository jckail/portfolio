import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollNavigation = (resumeData, headerHeight) => {
  const [currentSection, setCurrentSection] = useState('about-me');
  const sectionsRef = useRef({});

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    let newCurrentSection = 'about-me';

    Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
      if (sectionRef && scrollPosition >= sectionRef.offsetTop - headerHeight - 100) {
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
    console.log(`Attempting to scroll to section: ${sectionId}`);
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      console.log(`Scrolling to position: ${targetPosition - headerHeight}`);
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      if (updateUrl) {
        window.history.pushState(null, '', `#${sectionId}`);
      }
      setCurrentSection(sectionId);
    } else {
      console.error(`Target element not found for section: ${sectionId}`);
    }
  }, []);

  const handleInitialScroll = useCallback(() => {
    const hash = window.location.hash.slice(1);
    console.log(`Initial hash: ${hash}`);
    console.log(`Available sections:`, Object.keys(sectionsRef.current));
    if (hash && sectionsRef.current[hash] && headerHeight > 0) {
      console.log(`Scrolling to initial section: ${hash}`);
      setTimeout(() => {
        scrollToSection(hash, headerHeight, false);
      }, 1000); // Increased delay to 1000ms (1 second)
    } else {
      console.log(`Not scrolling initially. Hash: ${hash}, Header height: ${headerHeight}`);
    }
  }, [headerHeight, scrollToSection]);

  useEffect(() => {
    console.log(`useEffect triggered. resumeData: ${!!resumeData}, headerHeight: ${headerHeight}`);
    if (resumeData && headerHeight > 0) {
      console.log(`Resume data loaded and header height set. Calling handleInitialScroll.`);
      handleInitialScroll();
    } else {
      console.log(`Not calling handleInitialScroll. resumeData: ${!!resumeData}, headerHeight: ${headerHeight}`);
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  return { currentSection, sectionsRef, scrollToSection };
};
