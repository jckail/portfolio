import { useEffect } from 'react';

const SectionObserver = ({ resumeData }) => {
  useEffect(() => {
    if (!resumeData) return;
    
    let scrollTimeout;
    let isScrolling = false;
    
    // Debounce scroll events
    const handleScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      
      console.log('Scroll event fired', { isScrolling, timestamp: Date.now() });
      
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 1000); // Wait 1 second after scroll ends
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // Only process entries if we're not actively scrolling
        if (isScrolling) return;
        
        entries.forEach((entry) => {
          console.log('Intersection detected', {
            sectionId: entry.target.id,
            ratio: entry.intersectionRatio,
            isScrolling,
            timestamp: Date.now()
          });

          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              // Use pushState instead of replaceState to maintain proper history
              window.history.pushState(null, '', `#${sectionId}`);
            }
          }
        });
      },
      {
        threshold: [0.2, 0.5, 0.8], // Multiple thresholds for smoother transitions
        rootMargin: '-50px 0px -50px 0px'
      }
    );

    window.addEventListener('scroll', handleScroll, { passive: true });
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      sections.forEach(section => observer.unobserve(section));
      observer.disconnect();
      clearTimeout(scrollTimeout);
    };
  }, [resumeData]);

  return null;
};

export default SectionObserver;
