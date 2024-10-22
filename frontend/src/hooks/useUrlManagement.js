import { useRef, useCallback } from 'react';

export const useUrlManagement = () => {
  const timeoutRef = useRef(null);
  const initialScrollDone = useRef(false);

  const updateUrl = useCallback((sectionId, isPush = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (initialScrollDone.current) {
      if (isPush) {
        window.history.pushState(null, '', `#${sectionId}`);
        console.log('URL pushed to:', `#${sectionId}`);
      } else {
        window.history.replaceState(null, '', `#${sectionId}`);
        console.log('URL replaced with:', `#${sectionId}`);
      }
    }
  }, []);

  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return { updateUrl, initialScrollDone, cleanup };
};
