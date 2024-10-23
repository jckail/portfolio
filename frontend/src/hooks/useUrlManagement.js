import { useRef, useCallback, useEffect } from 'react';

export const useUrlManagement = () => {
  const initialScrollDone = useRef(false);

  const updateUrl = useCallback((sectionId, isPush = false) => {
    // Always update URL regardless of initialScrollDone state
    if (isPush) {
      window.history.pushState(null, '', `#${sectionId}`);
      console.log('URL pushed to:', `#${sectionId}`);
    } else {
      window.history.replaceState(null, '', `#${sectionId}`);
      console.log('URL replaced with:', `#${sectionId}`);
    }
  }, []);

  // Set initialScrollDone to true after component mounts
  useEffect(() => {
    initialScrollDone.current = true;
    return () => {
      initialScrollDone.current = false;
    };
  }, []);

  return { updateUrl };
};
