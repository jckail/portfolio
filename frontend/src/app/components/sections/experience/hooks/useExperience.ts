import { useState, useEffect } from 'react';

export const useExperience = () => {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('company') || null;
  });

  // Update URL when modal state changes
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    
    if (selectedExperience) {
      currentUrl.searchParams.set('company', selectedExperience);
    } else {
      currentUrl.searchParams.delete('company');
    }

    // Remove the hash from the URL object
    const hash = window.location.hash;
    const urlWithoutHash = currentUrl.toString().split('#')[0];
    
    // Construct the final URL with at most one hash
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    window.history.pushState({}, '', finalUrl);
  }, [selectedExperience]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedExperience(params.get('company'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    selectedExperience,
    setSelectedExperience
  };
};
