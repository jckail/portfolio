import { useState, useEffect } from 'react';

export const useContact = () => {
  const [selectedContact, setSelectedContact] = useState<boolean>(() => {
    // Initialize state based on URL parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('contact') === 'open';
  });

  // Update URL when modal state changes
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    
    if (selectedContact) {
      currentUrl.searchParams.set('contact', 'open');
    } else {
      currentUrl.searchParams.delete('contact');
    }

    // Remove the hash from the URL object
    const hash = window.location.hash;
    const urlWithoutHash = currentUrl.toString().split('#')[0];
    
    // Construct the final URL with at most one hash
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    window.history.pushState({}, '', finalUrl);
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
