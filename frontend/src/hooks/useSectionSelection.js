import { useState, useCallback, useRef, useEffect } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { debounce } from 'lodash';

export const useSectionSelection = (headerHeight, onSectionChange) => {
  const [currentSection, setCurrentSection] = useState('about-me');
  const sectionsRef = useRef({});

  // Central section update handler
  const handleSectionUpdate = useCallback((newSectionId, source) => {
    if (newSectionId && newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      onSectionChange(newSectionId, source);
    }
  }, [currentSection, onSectionChange]);

  // Create debounced version for intersection updates
  const debouncedHandleSectionUpdate = useCallback(
    debounce((newSectionId, source) => handleSectionUpdate(newSectionId, source), 150),
    [handleSectionUpdate]
  );

  // Setup intersection observer for viewport detection
  const { setupObserver } = useIntersectionObserver(
    headerHeight,
    (newSection) => {
      if (newSection) {
        debouncedHandleSectionUpdate(newSection, 'intersection');
      }
    }
  );

  // Setup observer when header height changes
  useEffect(() => {
    if (headerHeight > 0) {
      const cleanupObserver = setupObserver(sectionsRef);
      return cleanupObserver;
    }
  }, [headerHeight, setupObserver]);

  return {
    currentSection,
    sectionsRef,
    handleNavigationClick: () => {}, // Empty function since we removed navigation
    handleButtonClick: () => {} // Empty function since we removed navigation
  };
};
