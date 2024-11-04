import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollSpy = () => {
  const location = useLocation();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const currentUrl = new URL(window.location.href);
            const searchParams = currentUrl.search; // Keep the query params
            window.history.replaceState(null, '', `${currentUrl.pathname}${searchParams}#${id}`);
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    sections.forEach((section) => {
      if (observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    // Initial scroll to hash if present
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [location]);
};
