import { useCallback } from 'react';
import { debounce } from 'lodash';

export const useScrollBehavior = (headerHeight, currentSection, updateSection, sectionsRef) => {
  const updateSectionOnScroll = useCallback(() => {
    const scrollPosition = window.scrollY + headerHeight + 20;
    const viewportHeight = window.innerHeight;
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + viewportHeight;
    
    console.log('\n--- Scroll Update ---');
    console.log(`Scroll Position: ${Math.round(scrollPosition)}px`);
    console.log(`Window scrollY: ${Math.round(window.scrollY)}px`);
    console.log(`Viewport Height: ${viewportHeight}px`);
    console.log(`Viewport Range: ${Math.round(viewportTop)}px - ${Math.round(viewportBottom)}px`);
    console.log(`Header Height: ${headerHeight}px`);

    console.log('\nSection Positions:');
    Object.entries(sectionsRef.current).forEach(([id, element]) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementBottom = rect.bottom + window.scrollY;
        const isVisible = elementTop < viewportBottom && elementBottom > viewportTop;
        
        console.log(`${id}:`, {
          top: Math.round(elementTop),
          bottom: Math.round(elementBottom),
          visible: isVisible ? 'Yes' : 'No'
        });
      }
    });

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

    console.log(`\nSelected Section: ${newSection}`);
    console.log('-------------------\n');

    return newSection;
  }, [currentSection, headerHeight, sectionsRef]);

  const debouncedUpdateSection = useCallback(
    debounce(() => {
      const newSection = updateSectionOnScroll();
      if (newSection) {
        updateSection(newSection);
      }
    }, 100),
    [updateSectionOnScroll, updateSection]
  );

  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        console.log('\n--- Scroll To Section ---');
        console.log(`Section: ${sectionId}`);
        console.log(`Target Position: ${Math.round(targetPosition)}px`);
        console.log(`Current scrollY: ${Math.round(window.scrollY)}px`);
        console.log(`Header Height: ${headerHeight}px`);
        console.log('----------------------\n');

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        updateSection(sectionId, true);
      });
    }
  }, [headerHeight, updateSection]);

  return { debouncedUpdateSection, scrollToSection, updateSectionOnScroll };
};
