import { useState, useEffect, useRef } from 'react';

export const useExperience = () => {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('company') || null;
  });
  const lastUrlState = useRef<string | null>(null);

  const updateUrl = (company: string | null) => {
    const currentUrl = new URL(window.location.href);
    
    if (company) {
      currentUrl.searchParams.set('company', company);
    } else {
      currentUrl.searchParams.delete('company');
    }

    // Remove the hash from the URL object
    const hash = window.location.hash;
    const urlWithoutHash = currentUrl.toString().split('#')[0];
    
    // Construct the final URL with at most one hash
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    // Only update if the URL has actually changed
    if (finalUrl !== lastUrlState.current) {
      lastUrlState.current = finalUrl;
      window.history.replaceState({}, '', finalUrl);
    }
  };

  // Update URL when modal state changes
  useEffect(() => {
    updateUrl(selectedExperience);
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
