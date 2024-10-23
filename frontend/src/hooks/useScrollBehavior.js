import { useCallback } from 'react';
import { debounce } from 'lodash';

export const useScrollBehavior = (headerHeight, currentSection, updateSection, sectionsRef) => {
  const updateSectionOnScroll = useCallback(() => {
    const scrollPosition = window.scrollY + headerHeight;

    return Object.entries(sectionsRef.current)
      .reverse()
      .find(([_, element]) => element?.offsetTop <= scrollPosition)?.[0]
      || currentSection;
  }, [currentSection, headerHeight, sectionsRef]);

  const debouncedUpdateSection = useCallback(
    debounce(updateSectionOnScroll, 100),
    [updateSectionOnScroll]
  );

  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
      updateSection(sectionId, true);
    }
  }, [headerHeight, updateSection]);

  return { debouncedUpdateSection, scrollToSection, updateSectionOnScroll };
};
