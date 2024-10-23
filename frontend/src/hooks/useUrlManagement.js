import { useRef, useCallback } from 'react';

export const useUrlManagement = () => {
  const timeoutRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const initialScrollDone = useRef(false);

  const updateUrl = useCallback((sectionId, isPush = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const delayNeeded = Math.max(100 - timeSinceLastUpdate, 0);

    timeoutRef.current = setTimeout(() => {
      if (initialScrollDone.current) {
        if (isPush) {
          window.history.pushState(null, '', `#${sectionId}`);
          console.log('URL pushed to:', `#${sectionId}`);
        } else {
          window.history.replaceState(null, '', `#${sectionId}`);
          console.log('URL replaced with:', `#${sectionId}`);
        }
        lastUpdateRef.current = Date.now();
      }
    }, delayNeeded);
  }, []);

  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return { updateUrl, initialScrollDone, cleanup };
};
