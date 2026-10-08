import { useEffect, useRef } from 'react';

import { useSectionStore } from '../stores/section-store';
import { trackSectionView, trackAnchorChange } from '../utils/analytics';
import { scrollToSection } from '../utils/scroll-utils';
import { isScrollLocked } from './use-scroll-lock';
import { useLocation } from './use-location';

const DEBUG = import.meta.env.DEV;
const debugLog = (message: string, data?: unknown) => {
  if (DEBUG) {
    console.log(`[ScrollSpy] ${message}`, data ? JSON.stringify(data) : '');
  }
};

// Debounce helper with a cancel() so pending timers can be cleared on unmount
const debounce = <Args extends unknown[]>(fn: (...args: Args) => void, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, ms);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
};

export const useScrollSpy = () => {
  const location = useLocation();
  const setCurrentSection = useSectionStore((state) => state.setCurrentSection);
  const lastTrackedSection = useRef<string>('');
  const lastAnchor = useRef<string>('');
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    debugLog('ScrollSpy hook initialized');

    // Debounced URL update function
    const debouncedUpdateURL = debounce((id: string) => {
      debugLog('Updating URL', { section: id });
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const newHash = `${currentPath}${currentSearch}#${id}`;
      
      // Track anchor change if different from last tracked
      if (lastAnchor.current !== id) {
        trackAnchorChange(id, lastAnchor.current);
        lastAnchor.current = id;
      }
      
      // Use replaceState to avoid adding new history entries
      window.history.replaceState({}, '', newHash);
      setCurrentSection(id);
    }, 200); // Debounce URL updates by 200ms

    // Debounced analytics tracking
    const debouncedTrackSection = debounce((sectionId: string) => {
      debugLog('Tracking section view', { 
        section: sectionId,
        previousSection: lastTrackedSection.current 
      });
      
      if (lastTrackedSection.current !== sectionId) {
        debugLog('Section changed', {
          from: lastTrackedSection.current,
          to: sectionId
        });
        trackSectionView(sectionId);
        lastTrackedSection.current = sectionId;
      } else {
        debugLog('Section unchanged', { section: sectionId });
      }
    }, 500);

    let awaitingTarget = false;
    let targetObserver: MutationObserver | undefined;
    let targetTimeout: ReturnType<typeof setTimeout> | undefined;
    const cancelPendingTarget = () => {
      awaitingTarget = false;
      targetObserver?.disconnect();
      clearTimeout(targetTimeout);
    };

    // Function to handle scroll events with rate limiting
    const handleScroll = () => {
      // A modal holds the scroll lock: the page behind it is not what the
      // visitor is reading, so don't rewrite the hash or log section views.
      if (isScrollLocked() || awaitingTarget) return;

      const now = Date.now();
      // Limit updates to once every 50ms
      if (now - lastUpdateTime.current < 50) {
        return;
      }
      lastUpdateTime.current = now;

      const nodeList = document.querySelectorAll<HTMLElement>('section[id]');
      const sections = Array.from<HTMLElement>(nodeList);
      const header = document.querySelector<HTMLElement>('.header');
      const threshold = (header?.getBoundingClientRect().height ?? 72) + 80;
      let currentSection: HTMLElement | null = sections[0] ?? null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= threshold) currentSection = section;
      }

      // Update URL and track analytics if we found a section
      if (currentSection?.id) {
        debugLog('Found current section', { id: currentSection.id });
        debouncedUpdateURL(currentSection.id);
        debouncedTrackSection(currentSection.id);
      }
    };

    // Add scroll event listener with throttling
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });

    // Native anchors can be clicked before a lazy section exists. Resolve the
    // requested target after it mounts, rather than guessing a delay and later
    // pulling a visitor back to the initial section. replaceState from scroll
    // tracking deliberately does not re-run this effect (see useLocation).
    const targetId = location.hash.slice(1);
    if (targetId && targetId !== 'doodle') {
      awaitingTarget = true;
      const resolveTarget = () => {
        if (!awaitingTarget) return;
        if (window.location.hash !== location.hash) {
          cancelPendingTarget();
          return;
        }
        if (!document.getElementById(targetId)) return;
        cancelPendingTarget();
        scrollToSection(targetId);
        setCurrentSection(targetId);
        debouncedTrackSection(targetId);
      };
      targetObserver = new MutationObserver(resolveTarget);
      targetObserver.observe(document.body, { childList: true, subtree: true });
      targetTimeout = setTimeout(cancelPendingTarget, 10_000);
      resolveTarget();
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        window.addEventListener(event, cancelPendingTarget, { once: true, passive: true });
      }
    } else if (!targetId) {
      setCurrentSection('about');
    }

    return () => {
      debugLog('Cleaning up scroll spy');
      window.removeEventListener('scroll', scrollListener);
      cancelPendingTarget();
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        window.removeEventListener(event, cancelPendingTarget);
      }
      debouncedUpdateURL.cancel();
      debouncedTrackSection.cancel();
    };
  }, [location, setCurrentSection]);
};
