import { useCallback } from 'react';

const useScrollNavigation = () => {
  // Disabled scroll to section functionality
  const scrollToSection = useCallback(() => {
    // No-op: Scroll behavior disabled
    return;
  }, []);

  return {
    scrollToSection,
  };
};

export default useScrollNavigation;
