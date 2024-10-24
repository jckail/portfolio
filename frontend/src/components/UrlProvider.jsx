import React, { createContext, useContext, useCallback } from 'react';

const UrlContext = createContext();

export const useUrl = () => {
  const context = useContext(UrlContext);
  if (!context) {
    throw new Error('useUrl must be used within a UrlProvider');
  }
  return context;
};

export function UrlProvider({ children }) {
  const updateUrl = useCallback((sectionId, shouldPushState = false) => {
    // Only update URL if a valid sectionId is provided
    if (sectionId && sectionId.trim()) {
      const newUrl = `${window.location.pathname}#${sectionId}`;
      if (shouldPushState) {
        window.history.pushState({ path: newUrl }, '', newUrl);
      } else {
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
    // If no sectionId is provided, do nothing and keep the current URL
  }, []);

  const getCurrentSection = useCallback(() => {
    const hash = window.location.hash;
    return hash ? hash.replace('#', '') : '';
  }, []);

  const value = {
    updateUrl,
    getCurrentSection
  };

  return (
    <UrlContext.Provider value={value}>
      {children}
    </UrlContext.Provider>
  );
}
