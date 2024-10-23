import { useCallback, useRef } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);

  const handleIntersection = useCallback((entries) => {
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    
    if (visibleEntries.length > 0) {
      const mostVisible = visibleEntries.reduce((prev, current) => {
        return (prev.intersectionRatio > current.intersectionRatio) ? prev : current;
      });
      
      updateSection(mostVisible.target.id);
    }
  }, [updateSection]);

  const setupObserver = (sectionsRef) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      });
    }

    const observer = observerRef.current;
    
    Object.entries(sectionsRef.current).forEach(([_, section]) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  };

  return { setupObserver };
};
