import { useState, useRef } from 'react';

export const useScrollNavigation = (resumeData, headerHeight, onSectionChange) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});

  // Simplified hook that only maintains references and current section
  // without any automatic navigation or scroll behavior
  return { 
    currentSection, 
    sectionsRef,
    scrollToSection: () => {} // Empty function to maintain API compatibility
  };
};
