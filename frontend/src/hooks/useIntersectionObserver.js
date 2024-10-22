import { useCallback, useRef } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);

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
  }, [updateSection]);

  const setupObserver = (sectionsRef) => {
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

    return () => observer.disconnect();
  };

  return { setupObserver };
};
