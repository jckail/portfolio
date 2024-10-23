import { useCallback, useRef, useEffect } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);
  const headerHeightRef = useRef(headerHeight);
  const SCROLL_BUFFER = 20; // Buffer pixels below header

  // Update the ref when headerHeight changes
  useEffect(() => {
    headerHeightRef.current = headerHeight;
  }, [headerHeight]);

  const handleIntersection = useCallback((entries) => {
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    
    if (visibleEntries.length > 0) {
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

        // Calculate position scores (higher score for sections positioned right below header)
        const getPositionScore = (rect) => {
          const optimalPosition = headerHeightRef.current + SCROLL_BUFFER;
          const distanceFromOptimal = Math.abs(rect.top - optimalPosition);
          return 1 / (1 + distanceFromOptimal / window.innerHeight);
        };

        // Calculate visibility scores
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
  }, [updateSection]); // Removed headerHeight dependency

  const setupObserver = useCallback((sectionsRef) => {
    if (!observerRef.current) {
      // Create thresholds for more precise detection
      const thresholds = Array.from({ length: 100 }, (_, i) => i / 100);
      
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeightRef.current}px 0px 0px 0px`,
        threshold: thresholds,
      });

      // Observe all sections
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
  }, [handleIntersection]); // Removed headerHeight dependency

  return { setupObserver };
};
