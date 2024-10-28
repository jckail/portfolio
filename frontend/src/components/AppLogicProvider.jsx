import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { particleConfig } from '../configs';
import getParticlesConfig from '../particlesConfig';

const AppLogicContext = createContext();

export const useAppLogic = () => {
  const context = useContext(AppLogicContext);
  if (!context) {
    throw new Error('useAppLogic must be used within an AppLogicProvider');
  }
  return context;
};

const SectionBanner = ({ currentSection, sectionHistory }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'red',
      color: 'white',
      padding: '10px',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px',
      fontSize: '14px'
    }}>
      <span>
        <strong>Current:</strong> {currentSection.id} 
        <em style={{ marginLeft: '5px', fontSize: '12px' }}>
          (set by {currentSection.source})
        </em>
      </span>
      <span>
        <strong>History:</strong> {sectionHistory.map((item, index) => (
          <span key={index}>
            {index > 0 ? ' → ' : ''}
            {item.id}
            <em style={{ marginLeft: '5px', fontSize: '12px' }}>
              ({item.source})
            </em>
          </span>
        ))}
      </span>
    </div>
  );
};

export function AppLogicProvider({ children }) {
  // Determine the initial source based on navigation type
  const getInitialSource = () => {
    const isRefresh = window.performance.navigation.type === 1;
    const hasReferrer = document.referrer !== '';
    const hasHash = window.location.hash !== '';
    
    if (isRefresh) return 'refresh';
    if (!hasReferrer && hasHash) return 'url_entry';
    return 'initial';
  };

  // Get initial section from URL hash or default to 'about-me'
  const initialSection = window.location.hash.slice(1) || 'about-me';
  const initialSource = getInitialSource();
  
  const [theme, setTheme] = useState('dark');
  const [currentSection, setCurrentSection] = useState({ id: initialSection, source: initialSource });
  const [sectionHistory, setSectionHistory] = useState([]);
  const sectionsRef = useRef({});
  const isManualNavigationRef = useRef(false);
  const lastClickSourceRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Effect to handle initial scroll
  useEffect(() => {
    if (isInitialLoadRef.current && initialSection) {
      isManualNavigationRef.current = true;
      
      // Wait for refs to be set up
      requestAnimationFrame(() => {
        const element = sectionsRef.current[initialSection];
        if (element) {
          element.scrollIntoView({ behavior: 'instant' });
          
          // Reset the manual navigation flag after initial scroll
          setTimeout(() => {
            isManualNavigationRef.current = false;
            console.log('Initial navigation complete, enabling observer');
          }, 100);
        }
      });
    }
  }, [initialSection]);

  // Wrapper for setCurrentSection that includes source information
  const updateCurrentSection = useCallback((sectionId, source) => {
    console.log(`Section Update - ID: ${sectionId}, Source: ${source}`, {
      timestamp: new Date().toISOString(),
      previousSection: currentSection,
      isInitialLoad: isInitialLoadRef.current,
      isManualNavigation: isManualNavigationRef.current
    });

    setCurrentSection({ id: sectionId, source });
  }, [currentSection]);

  // Update section history when currentSection changes
  useEffect(() => {
    setSectionHistory(prev => {
      const newHistory = [...prev];
      if (currentSection.id !== (newHistory[0]?.id)) {
        newHistory.unshift(currentSection);
        console.log('Section History Updated:', {
          current: currentSection,
          history: newHistory.slice(0, 3)
        });
        return newHistory.slice(0, 3); // Keep only last 3 sections
      }
      return prev;
    });
  }, [currentSection]);

  // Update URL when currentSection changes
  useEffect(() => {
    if (currentSection.id) {
      window.history.replaceState(null, '', `#${currentSection.id}`);
    }
  }, [currentSection]);

  // Apply theme to the document body
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // Generate particle configuration based on the current theme
  const updateParticlesConfig = useCallback(() => {
    const config = particleConfig[theme];
    return getParticlesConfig(
      config.background_color,
      config.particle_color,
      config.line_color
    );
  }, [theme]);

  // Helper function to safely set section refs
  const setSectionRef = useCallback((sectionId, element) => {
    if (element) {
      sectionsRef.current[sectionId] = element;
    }
  }, []);

  // Handle section click for navigation
  const handleSectionClick = useCallback((sectionId, source = 'sidebar') => {
    // Set manual navigation flag before any updates
    isManualNavigationRef.current = true;
    lastClickSourceRef.current = source;
    
    // First update the current section
    updateCurrentSection(sectionId, source);
    
    // Then scroll to the section after a brief delay to ensure state is updated
    requestAnimationFrame(() => {
      const element = sectionsRef.current[sectionId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Reset the manual navigation flag after animation completes
      setTimeout(() => {
        isManualNavigationRef.current = false;
        lastClickSourceRef.current = null;
        console.log('Manual navigation complete, re-enabling observer');
      }, 1000);
    });
  }, [updateCurrentSection]);

  // Handle button click (used for resume download)
  const handleButtonClick = useCallback((sectionId) => {
    updateCurrentSection(sectionId, 'button');
  }, [updateCurrentSection]);

  const SectionObserver = () => {
    useEffect(() => {
      console.log('Setting up intersection observer');
      
      const observer = new IntersectionObserver(
        (entries) => {
          // Don't process entries during manual navigation
          if (isManualNavigationRef.current) {
            console.log('Skipping intersection due to manual navigation');
            return;
          }
          
          // Sort entries by their intersection ratio to find the most visible section
          const visibleEntries = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          
          if (visibleEntries.length > 0) {
            const mostVisibleEntry = visibleEntries[0];
            const sectionId = mostVisibleEntry.target.id;
            
            console.log('Intersection detected', {
              sectionId,
              ratio: mostVisibleEntry.intersectionRatio,
              isManualNavigation: isManualNavigationRef.current,
              currentSection: currentSection.id
            });
            
            // Only update if the section has actually changed
            if (sectionId && currentSection.id !== sectionId) {
              console.log('Updating section from observer');
              updateCurrentSection(sectionId, 'observer');
            }
          }
        },
        {
          threshold: [0.1, 0.2, 0.3], // More granular thresholds
          rootMargin: '-10% 0px -10% 0px' // Adjust intersection box
        }
      );
  
      const sections = document.querySelectorAll('section[id]');
      sections.forEach((section) => {
        observer.observe(section);
        console.log(`Observing section: ${section.id}`);
      });
  
      // After initial mount, mark as no longer initial load
      isInitialLoadRef.current = false;
  
      return () => {
        sections.forEach(section => observer.unobserve(section));
        observer.disconnect();
      };
    }, [currentSection.id, updateCurrentSection]);
  
    return (
      <SectionBanner 
        currentSection={currentSection}
        sectionHistory={sectionHistory}
      />
    );
  };

  const value = {
    theme,
    currentSection: currentSection.id, // Keep the external API unchanged
    sectionsRef,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig,
    SectionObserver
  };

  return (
    <AppLogicContext.Provider value={value}>
      {children}
    </AppLogicContext.Provider>
  );
}
