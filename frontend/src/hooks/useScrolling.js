import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { gaService } from '../utils/google-analytics';

const SCROLL_DEBOUNCE_TIME = 1000;
const SCROLL_OFFSET = 20;

export const useScrolling = (headerHeight) => {
  const [currentSection, setCurrentSection] = useState(
    () => window.location.hash.slice(1) || 'about-me'
  );
  const sectionsRef = useRef({});
  const initialScrollPerformed = useRef(false);
  const lastTrackedSection = useRef(null);
  const observerRef = useRef(null);

  // URL Management
  const updateUrl = useCallback((sectionId, isPush = false) => {
    if (initialScrollPerformed.current) {
      const method = isPush ? 'pushState' : 'replaceState';
      window.history[method](null, '', `#${sectionId}`);
    }
  }, []);

  // Analytics Tracking
  const trackSection = useCallback((newSectionId) => {
    if (newSectionId && lastTrackedSection.current !== newSectionId) {
      gaService.trackPageView(
        `/${newSectionId}`,
        newSectionId.split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      );
      lastTrackedSection.current = newSectionId;
    }
  }, []);

  // Section Update Logic
  const updateSection = useCallback((newSectionId, isPush = false) => {
    if (newSectionId !== currentSection) {
      setCurrentSection(newSectionId);
      trackSection(newSectionId);
      updateUrl(newSectionId, isPush);
    }
  }, [currentSection, trackSection, updateUrl]);

  // Intersection Observer Setup
  const setupIntersectionObserver = useCallback(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter(entry => entry.isIntersecting);
          const effectiveViewportHeight = window.innerHeight - headerHeight;
          
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
        },
        {
          rootMargin: `-${headerHeight}px 0px -50% 0px`,
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        }
      );

      Object.values(sectionsRef.current).forEach(section => {
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
  }, [headerHeight, updateSection]);

  // Scroll Behavior
  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      requestAnimationFrame(() => {
        const targetPosition = 
          targetElement.getBoundingClientRect().top + 
          window.pageYOffset - 
          headerHeight - 
          SCROLL_OFFSET;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        updateSection(sectionId, true);
      });
    }
  }, [headerHeight, updateSection]);

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + headerHeight + SCROLL_OFFSET;
    const viewportHeight = window.innerHeight;
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + viewportHeight;

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
  }, [currentSection, headerHeight, updateSection]);

  const debouncedHandleScroll = useCallback(
    debounce(handleScroll, SCROLL_DEBOUNCE_TIME),
    [handleScroll]
  );

  // Initial Scroll Handler
  const handleInitialScroll = useCallback(() => {
    if (!initialScrollPerformed.current && headerHeight > 0) {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        scrollToSection(hash);
      }
      initialScrollPerformed.current = true;
    }
  }, [headerHeight, scrollToSection]);

  // Effect Hooks
  useEffect(() => {
    const cleanupObserver = setupIntersectionObserver();
    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        initialScrollPerformed.current = false;
        handleInitialScroll();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cleanupObserver();
      window.removeEventListener('scroll', debouncedHandleScroll);
      window.removeEventListener('hashchange', handleHashChange);
      debouncedHandleScroll.cancel();
    };
  }, [
    debouncedHandleScroll,
    setupIntersectionObserver,
    handleInitialScroll
  ]);

  useEffect(() => {
    handleInitialScroll();
  }, [handleInitialScroll]);

  return {
    currentSection,
    sectionsRef,
    scrollToSection
  };
};
