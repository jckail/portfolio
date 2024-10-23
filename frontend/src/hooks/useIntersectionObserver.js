import { useCallback, useRef } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);

  const handleIntersection = useCallback((entries) => {
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    const effectiveViewportHeight = window.innerHeight - headerHeight;
    
    // Find the most visible section considering header overlap
    let mostVisibleEntry = null;
    let maxViewportCoverage = 0;

    visibleEntries.forEach(entry => {
      const rect = entry.boundingClientRect;
      const intersection = entry.intersectionRect;
      
      const isOverlappingHeader = rect.top < headerHeight && rect.bottom > headerHeight;
      const effectiveTop = Math.max(intersection.top, headerHeight);
      const effectiveBottom = Math.min(intersection.bottom, window.innerHeight);
      const visiblePixels = Math.max(0, effectiveBottom - effectiveTop);
      
      const headerOverlapPenalty = isOverlappingHeader ? 
        Math.min(headerHeight - rect.top, headerHeight) : 0;
      
      const adjustedVisiblePixels = Math.max(0, visiblePixels - headerOverlapPenalty);
      const viewportCoverage = adjustedVisiblePixels / effectiveViewportHeight;
      
      if (viewportCoverage > maxViewportCoverage) {
        maxViewportCoverage = viewportCoverage;
        mostVisibleEntry = entry;
      }
    });

    if (mostVisibleEntry) {
      updateSection(mostVisibleEntry.target.id);
    }
  }, [updateSection, headerHeight]);

  const setupObserver = (sectionsRef) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeight}px 0px -50% 0px`,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      });
    }

    const observer = observerRef.current;
    
    Object.entries(sectionsRef.current).forEach(([_, section]) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      observer.disconnect();
    };
  };

  return { setupObserver };
};
