import { useState, useEffect, useRef } from 'react';

export function useScrollHandler(headerHeight, isSidebarOpen) {
  const [currentSection, setCurrentSection] = useState('technical-skills');
  const [isTemporarilyVisible, setIsTemporarilyVisible] = useState(false);
  const timeoutRef = useRef(null);
  const sectionsRef = useRef({});

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      let currentActiveSection = 'technical-skills';

      Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
        if (sectionRef && scrollPosition >= sectionRef.offsetTop - headerHeight - 10) {
          currentActiveSection = sectionId;
        }
      });

      setCurrentSection(currentActiveSection);

      if (!isSidebarOpen) {
        setIsTemporarilyVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsTemporarilyVisible(false);
        }, 1000);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [headerHeight, isSidebarOpen]);

  return { currentSection, isTemporarilyVisible, sectionsRef };
}
