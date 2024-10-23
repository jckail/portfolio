import { useCallback } from 'react';

export const useScrollBehavior = (headerHeight, currentSection, updateSection, sectionsRef) => {
  const updateSectionOnScroll = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + viewportHeight;

    // Find the first visible section when scrolling down
    const newSection = Object.entries(sectionsRef.current)
      .find(([_, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = rect.bottom + window.scrollY;
          return elementTop < viewportBottom && elementBottom > viewportTop;
        }
        return false;
      })?.[0] || currentSection;

    if (newSection) {
      updateSection(newSection);
    }
  }, [currentSection, sectionsRef, updateSection]);

  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        updateSection(sectionId);
      });
    }
  }, [headerHeight, updateSection]);

  return { updateSectionOnScroll, scrollToSection };
};
