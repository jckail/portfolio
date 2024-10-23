import { useRef, useCallback, useEffect } from 'react';

// Use the same offset as defined in HeaderNav
const SCROLL_OFFSET = 65;

// Valid sections that can be loaded
const VALID_SECTIONS = [
  'about-me',
  'technical-skills',
  'experience',
  'projects',
  'my-resume'
];

export const useDirectPageLoad = (headerHeight, onSectionChange) => {
  const initialLoadPerformed = useRef(false);
  const isFirstVisit = useRef(localStorage.getItem('hasVisitedBefore') !== 'true');
  const scrollAttempts = useRef(0);
  const maxScrollAttempts = 20; // Increased for more thorough checks

  // Get and validate section from URL hash
  const getValidSection = useCallback(() => {
    const hashSection = window.location.hash.slice(1);
    return VALID_SECTIONS.includes(hashSection) ? hashSection : '';
  }, []);

  // Check if images within an element are loaded
  const areImagesLoaded = useCallback((element) => {
    const images = element.getElementsByTagName('img');
    return Array.from(images).every(img => img.complete);
  }, []);

  // Check if all DOM elements in a section are properly rendered
  const isSectionFullyRendered = useCallback((sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    // Check section dimensions
    const hasHeight = section.offsetHeight > 0;
    const hasContent = section.innerHTML.trim().length > 0;
    const imagesLoaded = areImagesLoaded(section);
    
    // Check for dynamic content markers
    const hasAllContent = section.querySelectorAll('*').length > 0;
    const hasNoLoadingStates = !section.querySelector('.loading, .skeleton');
    
    return hasHeight && hasContent && imagesLoaded && hasAllContent && hasNoLoadingStates;
  }, [areImagesLoaded]);

  // Scroll to section function with improved rendering handling
  const scrollToSection = useCallback((sectionId) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      // Force a layout calculation to ensure all elements are rendered
      document.body.offsetHeight;
      
      // Use double requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Get fresh measurements after layout is complete
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
          window.scrollTo({
            top: targetPosition,
            behavior: 'instant'
          });
        });
      });
    }
  }, []);

  // Check if all sections and their content are fully rendered
  const isContentFullyLoaded = useCallback(() => {
    // Check all sections
    const sectionStates = VALID_SECTIONS.map(sectionId => {
      const isReady = isSectionFullyRendered(sectionId);
      const section = document.getElementById(sectionId);
      
      return {
        id: sectionId,
        exists: Boolean(section),
        height: section?.offsetHeight || 0,
        hasContent: section?.innerHTML.trim().length > 0,
        imagesLoaded: section ? areImagesLoaded(section) : false,
        elementCount: section?.querySelectorAll('*').length || 0,
        isReady
      };
    });

    // Check global elements
    const header = document.querySelector('header');
    const navigation = document.querySelector('nav');
    const globalImagesLoaded = areImagesLoaded(document.body);

    const allSectionsReady = sectionStates.every(section => section.isReady);
    const globalElementsReady = header && navigation && globalImagesLoaded;

    console.log('\n--- Content Ready Check ---');
    console.log('Sections:');
    sectionStates.forEach(section => {
      console.log(`${section.id}:`, {
        exists: section.exists,
        height: `${section.height}px`,
        hasContent: section.hasContent,
        imagesLoaded: section.imagesLoaded,
        elementCount: section.elementCount,
        ready: section.isReady
      });
    });
    console.log('Global Elements:', {
      headerExists: Boolean(header),
      navigationExists: Boolean(navigation),
      globalImagesLoaded
    });
    console.log(`All Content Ready: ${allSectionsReady && globalElementsReady}`);
    console.log('------------------------\n');

    return allSectionsReady && globalElementsReady;
  }, [isSectionFullyRendered, areImagesLoaded]);

  // Handle direct page load section with retry mechanism
  const handleDirectPageLoad = useCallback((sectionsRef) => {
    if (!initialLoadPerformed.current && headerHeight > 0) {
      const section = getValidSection();
      const isRefresh = performance.navigation.type === 1;
      const isDirectUrl = !isRefresh && window.location.hash;
      
      console.log('\n--- Direct Page Load ---');
      console.log(`Load Type: ${isFirstVisit.current ? 'First Visit' : isRefresh ? 'Page Refresh' : isDirectUrl ? 'Direct URL' : 'Normal Navigation'}`);
      console.log(`Target Section: ${section}`);
      console.log(`Header Height: ${headerHeight}px`);
      console.log(`Scroll Attempts: ${scrollAttempts.current}`);
      console.log('------------------------\n');

      // Check if all content is ready
      if (isContentFullyLoaded()) {
        if (section) {
          onSectionChange(section, 'direct-load');
          scrollToSection(section);
        }
        initialLoadPerformed.current = true;
        
        if (isFirstVisit.current) {
          localStorage.setItem('hasVisitedBefore', 'true');
        }
      } else if (scrollAttempts.current < maxScrollAttempts) {
        // If content isn't ready, retry after a delay with exponential backoff
        scrollAttempts.current++;
        const delay = Math.min(100 * Math.pow(2, scrollAttempts.current), 2000); // Cap at 2 seconds
        setTimeout(() => {
          handleDirectPageLoad(sectionsRef);
        }, delay);
      } else {
        console.warn('Maximum scroll attempts reached, some content may not be fully loaded');
        initialLoadPerformed.current = true;
      }
    }
  }, [headerHeight, onSectionChange, scrollToSection, getValidSection, isContentFullyLoaded]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (initialLoadPerformed.current) {
        const section = getValidSection();
        console.log('\n--- Browser Navigation ---');
        console.log(`Navigating to section: ${section}`);
        console.log('------------------------\n');
        
        if (section) {
          // Reset scroll attempts and check content again
          scrollAttempts.current = 0;
          const checkAndScroll = () => {
            if (isContentFullyLoaded()) {
              onSectionChange(section, 'browser-navigation');
              scrollToSection(section);
            } else if (scrollAttempts.current < maxScrollAttempts) {
              scrollAttempts.current++;
              const delay = Math.min(100 * Math.pow(2, scrollAttempts.current), 2000);
              setTimeout(checkAndScroll, delay);
            }
          };
          checkAndScroll();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getValidSection, onSectionChange, scrollToSection, isContentFullyLoaded, maxScrollAttempts]);

  return {
    initialSection: getValidSection(),
    handleDirectPageLoad,
    isFirstVisit: isFirstVisit.current
  };
};
