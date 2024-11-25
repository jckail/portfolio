import { useState, useEffect, useRef } from 'react';

export const useExperience = () => {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('company') || null;
  });
  const lastUrlState = useRef<string | null>(null);
  const currentHash = useRef(window.location.hash);

  const updateUrl = (company: string | null) => {
    const url = new URL(window.location.href);
    
    if (company) {
      url.searchParams.set('company', company);
    } else {
      url.searchParams.delete('company');
    }

    // Keep the original hash without modifying it
    const urlWithoutHash = url.toString().split('#')[0];
    const finalUrl = currentHash.current ? `${urlWithoutHash}${currentHash.current}` : urlWithoutHash;
    
    // Only update if the URL has actually changed
    if (finalUrl !== lastUrlState.current) {
      lastUrlState.current = finalUrl;
      window.history.replaceState({}, '', finalUrl);
    }
  };

  // Store initial hash when component mounts
  useEffect(() => {
    currentHash.current = window.location.hash;
  }, []);

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
