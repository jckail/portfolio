import { useRef, useCallback } from 'react';

export const useUrlManagement = () => {
  const initialScrollDone = useRef(false);

  const updateUrl = useCallback((sectionId, isPush = false) => {
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
    // No cleanup needed anymore since we removed the timeout
  };

  return { updateUrl, initialScrollDone, cleanup };
};
