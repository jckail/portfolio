import { useCallback, useRef } from 'react';

export const useIntersectionObserver = (headerHeight, updateSection) => {
  const observerRef = useRef(null);

  const handleIntersection = useCallback((entries) => {
    console.log('\n--- Intersection Update ---');
    console.log(`Header Height: ${headerHeight}px`);
    console.log(`Viewport Height: ${window.innerHeight}px`);
    console.log(`Effective Viewport: ${headerHeight}px to ${window.innerHeight}px`);
    
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    const effectiveViewportHeight = window.innerHeight - headerHeight;
    
    entries.forEach((entry) => {
      const rect = entry.boundingClientRect;
      const intersection = entry.intersectionRect;
      
      // Calculate visible area excluding header overlap
      const isOverlappingHeader = rect.top < headerHeight && rect.bottom > headerHeight;
      const effectiveTop = Math.max(intersection.top, headerHeight);
      const effectiveBottom = Math.min(intersection.bottom, window.innerHeight);
      const visiblePixels = Math.max(0, effectiveBottom - effectiveTop);
      
      // If section overlaps with header, reduce its score
      const headerOverlapPenalty = isOverlappingHeader ? 
        Math.min(headerHeight - rect.top, headerHeight) : 0;
      
      const adjustedVisiblePixels = Math.max(0, visiblePixels - headerOverlapPenalty);
      const viewportCoverage = adjustedVisiblePixels / effectiveViewportHeight;
      
      console.log(`\nSection: ${entry.target.id}`);
      console.log(`  Intersecting: ${entry.isIntersecting}`);
      console.log(`  Position:`, {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        overlapsHeader: isOverlappingHeader,
        headerOverlap: Math.round(headerOverlapPenalty)
      });
      console.log(`  Visibility:`, {
        rawPixels: Math.round(visiblePixels),
        adjustedPixels: Math.round(adjustedVisiblePixels),
        viewportCoverage: Math.round(viewportCoverage * 100) + '%'
      });
    });

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
      const rect = mostVisibleEntry.boundingClientRect;
      const intersection = mostVisibleEntry.intersectionRect;
      const isOverlappingHeader = rect.top < headerHeight && rect.bottom > headerHeight;
      const effectiveTop = Math.max(intersection.top, headerHeight);
      const effectiveBottom = Math.min(intersection.bottom, window.innerHeight);
      const visiblePixels = Math.max(0, effectiveBottom - effectiveTop);
      const headerOverlapPenalty = isOverlappingHeader ? 
        Math.min(headerHeight - rect.top, headerHeight) : 0;
      const adjustedVisiblePixels = Math.max(0, visiblePixels - headerOverlapPenalty);
      
      console.log('\nSelected Section:', {
        id: mostVisibleEntry.target.id,
        adjustedPixels: Math.round(adjustedVisiblePixels) + 'px',
        viewportCoverage: Math.round((adjustedVisiblePixels / effectiveViewportHeight) * 100) + '%',
        overlapsHeader: isOverlappingHeader,
        headerOverlap: Math.round(headerOverlapPenalty) + 'px'
      });
      updateSection(mostVisibleEntry.target.id);
    } else {
      console.log('\nNo section selected');
    }
    console.log('------------------------\n');
  }, [updateSection, headerHeight]);

  const setupObserver = (sectionsRef) => {
    if (!observerRef.current) {
      console.log('\n--- Setting up Intersection Observer ---');
      console.log(`Header Height: ${headerHeight}px`);
      console.log(`Root Margin: -${headerHeight}px 0px -50% 0px`);
      
      observerRef.current = new IntersectionObserver(handleIntersection, {
        rootMargin: `-${headerHeight}px 0px -50% 0px`,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      });

      console.log('Threshold points:', [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        .map(t => `${Math.round(t * 100)}%`)
        .join(', '));
    }

    const observer = observerRef.current;
    
    console.log('\nObserving Sections:');
    Object.entries(sectionsRef.current).forEach(([id, section]) => {
      if (section) {
        observer.observe(section);
        const rect = section.getBoundingClientRect();
        console.log(`- ${id}:`, {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height)
        });
      }
    });

    return () => {
      console.log('Disconnecting Intersection Observer');
      observer.disconnect();
    };
  };

  return { setupObserver };
};
