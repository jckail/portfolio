import { useCallback, useRef, useEffect } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);
  const headerHeightRef = useRef(headerHeight);

  useEffect(() => {
    headerHeightRef.current = headerHeight;
  }, [headerHeight]);

  const handleIntersection = useCallback((entries) => {
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    
    if (visibleEntries.length > 0) {
      // First, find the topmost fully visible section
      const fullyVisibleEntries = visibleEntries.filter(entry => {
        const rect = entry.boundingClientRect;
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });

      if (fullyVisibleEntries.length > 0) {
        const topSection = fullyVisibleEntries.reduce((prev, current) => {
          return prev.boundingClientRect.top < current.boundingClientRect.top ? prev : current;
        });
        updateSection(topSection.target.id);
        return;
      }

      // If no fully visible sections, use the original visibility scoring
      const mostVisible = visibleEntries.reduce((prev, current) => {
        const prevRect = prev.boundingClientRect;
        const currentRect = current.boundingClientRect;
        
        // Calculate visible heights considering header
        const getVisibleHeight = (rect) => {
          const viewportHeight = window.innerHeight;
          const top = Math.max(rect.top, headerHeightRef.current);
          const bottom = Math.min(rect.bottom, viewportHeight);
          return Math.max(0, bottom - top);
        };

        // Calculate position scores
        const getPositionScore = (rect) => {
          const optimalPosition = headerHeightRef.current;
          const distanceFromOptimal = Math.abs(rect.top - optimalPosition);
          return 1 / (1 + distanceFromOptimal / window.innerHeight);
        };

        const prevHeight = getVisibleHeight(prevRect);
        const currentHeight = getVisibleHeight(currentRect);
        
        const prevPositionScore = getPositionScore(prevRect);
        const currentPositionScore = getPositionScore(currentRect);

        // Combine scores with weights
        const VISIBILITY_WEIGHT = 0.75;
        const POSITION_WEIGHT = 0.25;

        const prevScore = (prevHeight * VISIBILITY_WEIGHT) + 
                         (prevPositionScore * POSITION_WEIGHT * window.innerHeight);
        const currentScore = (currentHeight * VISIBILITY_WEIGHT) + 
                           (currentPositionScore * POSITION_WEIGHT * window.innerHeight);

        return prevScore > currentScore ? prev : current;
      });

      updateSection(mostVisible.target.id);
    }
  }, [updateSection]);

  const setupObserver = useCallback((sectionsRef) => {
    if (!observerRef.current) {
      const thresholds = Array.from({ length: 100 }, (_, i) => i / 100);
      
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeightRef.current}px 0px 0px 0px`,
        threshold: thresholds,
      });

      Object.entries(sectionsRef.current).forEach(([_, section]) => {
        if (section) {
          observerRef.current.observe(section);
        }
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [handleIntersection]);

  return { setupObserver };
};
