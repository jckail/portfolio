import { useCallback } from 'react';

export const useUrlManagement = () => {
  const updateUrl = useCallback((sectionId) => {
    // Only update URL if a valid sectionId is provided
    if (sectionId && sectionId.trim()) {
      const newUrl = `${window.location.pathname}#${sectionId}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
    // If no sectionId is provided, do nothing and keep the current URL
  }, []);

  const getCurrentSection = useCallback(() => {
    const hash = window.location.hash;
    return hash ? hash.replace('#', '') : '';
  }, []);

  return {
    updateUrl,
    getCurrentSection,
  };
};
