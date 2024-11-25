import { useState, useEffect } from 'react';

export const useSkill = () => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('skill');
  });

  // Update URL when modal state changes
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    
    if (selectedSkill) {
      currentUrl.searchParams.set('skill', selectedSkill);
    } else {
      currentUrl.searchParams.delete('skill');
    }

    // Remove the hash from the URL object
    const hash = window.location.hash;
    const urlWithoutHash = currentUrl.toString().split('#')[0];
    
    // Construct the final URL with at most one hash
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    window.history.pushState({}, '', finalUrl);
  }, [selectedSkill]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedSkill(params.get('skill'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    selectedSkill,
    setSelectedSkill
  };
};
