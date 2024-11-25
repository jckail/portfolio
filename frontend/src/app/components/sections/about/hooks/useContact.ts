import { useState, useEffect, useRef } from 'react';

export const useContact = () => {
  const [selectedContact, setSelectedContact] = useState<boolean>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('contact') === 'open';
  });
  const lastUrlState = useRef<string | null>(null);

  const updateUrl = (isOpen: boolean) => {
    const currentUrl = new URL(window.location.href);
    
    if (isOpen) {
      currentUrl.searchParams.set('contact', 'open');
    } else {
      currentUrl.searchParams.delete('contact');
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
    updateUrl(selectedContact);
  }, [selectedContact]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedContact(params.get('contact') === 'open');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    selectedContact,
    setSelectedContact
  };
};
