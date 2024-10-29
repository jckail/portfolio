import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import { particleConfig } from '../configs';
import getParticlesConfig from '../particlesConfig';
import SidePanel from './SidePanel';
import TelemetryBanner from '../telemetry/TelemetryBanner';
import Header from './Header';
import MainContent from './MainContent';
import AdminHandler from './AdminHandler';
import { useResume } from './ResumeProvider';
import { useSidebar } from './SidebarProvider';
import { ParticlesProvider } from './ParticlesProvider';
import TelemetryCollector from '../utils/TelemetryCollector';

const AppLogicContext = createContext();

export const useAppLogic = () => {
  const context = useContext(AppLogicContext);
  if (!context) {
    throw new Error('useAppLogic must be used within an AppLogicProvider');
  }
  return context;
};

export function AppContent() {
  const {
    theme,
    currentSection,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig, 
    SectionObserver
  } = useAppLogic();

  const {
    isSidebarOpen,
    isTemporarilyVisible,
    toggleSidebar
  } = useSidebar();

  const {
    resumeData,
    error,
    handleDownload
  } = useResume();

  const {
    isAdminLoggedIn,
    handleAdminClick,
    AdminLoginComponent
  } = AdminHandler();

  // Initialize telemetry collection
  useEffect(() => {
    TelemetryCollector.initialize();
    return () => {
      TelemetryCollector.cleanup();
    };
  }, []);

  const handleResumeClick = (event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    handleDownload();
  };

  return (
    <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
      <div className="App app-wrapper">
        <TelemetryBanner isAdminLoggedIn={isAdminLoggedIn} />
        <div id="particles-js"></div>
        <div className={`app-content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
          <Header 
            resumeData={resumeData}
            theme={theme}
            toggleTheme={toggleTheme}
            handleResumeClick={handleResumeClick}
            handleAdminClick={handleAdminClick}
            isAdminLoggedIn={isAdminLoggedIn}
            toggleSidebar={toggleSidebar}
          />
          <SidePanel 
            isOpen={isSidebarOpen} 
            currentSection={currentSection} 
            onClose={toggleSidebar}
            isTemporarilyVisible={isTemporarilyVisible}
            handleSectionClick={handleSectionClick}
          />
          <MainContent 
            resumeData={resumeData}
            error={error}
            setSectionRef={setSectionRef}
          />
          {AdminLoginComponent}
        </div>
      </div>
      <SectionObserver resumeData={resumeData} />
    </ParticlesProvider>
  );
}

export function AppLogicProvider({ children }) {
  console.log('Rendering AppLogicProvider', {
    timestamp: new Date().toISOString(),
    performance: window.performance.now()
  });

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
  const observerRef = useRef(null);
  const renderCountRef = useRef(0);

  // Create debounced URL update function
  const debouncedUpdateUrl = useRef(
    debounce((sectionId) => {
      console.log('Updating URL (debounced)', {
        timestamp: new Date().toISOString(),
        sectionId
      });
      window.history.replaceState(null, '', `#${sectionId}`);
    }, 1000)
  ).current;

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateUrl.cancel();
    };
  }, [debouncedUpdateUrl]);

  // Log render count
  useEffect(() => {
    renderCountRef.current += 1;
    console.log('AppLogicProvider rendered', {
      timestamp: new Date().toISOString(),
      renderCount: renderCountRef.current,
      currentSection: currentSection.id,
      source: currentSection.source
    });
  });

  // Effect to handle initial scroll
  useEffect(() => {
    if (isInitialLoadRef.current && initialSection) {
      isManualNavigationRef.current = true;
      
      // Wait for refs to be set up
      requestAnimationFrame(() => {
        const element = sectionsRef.current[initialSection];
        if (element) {
          element.scrollIntoView({ behavior: 'instant' });
          isManualNavigationRef.current = false;
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

  // Update URL when currentSection changes (debounced)
  useEffect(() => {
    if (currentSection.id) {
      debouncedUpdateUrl(currentSection.id);
    }
  }, [currentSection.id, debouncedUpdateUrl]);

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
        element.scrollIntoView({ behavior: 'instant' });
      }
      
      // Reset the manual navigation flag after animation completes
      setTimeout(() => {
        isManualNavigationRef.current = false;
        lastClickSourceRef.current = null;
      }, 1000);
    });
  }, [updateCurrentSection]);

  // Handle button click (used for resume download)
  const handleButtonClick = useCallback((sectionId) => {
    updateCurrentSection(sectionId, 'button');
  }, [updateCurrentSection]);

  const SectionObserver = () => {
    console.log('Rendering SectionObserver', {
      timestamp: new Date().toISOString(),
      currentSection: currentSection.id,
      isManualNavigation: isManualNavigationRef.current
    });

    useEffect(() => {
      console.log('Setting up intersection observer');

      // Create the observer
      observerRef.current = new IntersectionObserver(
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
          threshold: [0.1, 0.2, 0.3],
          rootMargin: '-10% 0px -10% 0px'
        }
      );

      // Start observing sections when scroll starts
      const handleScroll = () => {
        if (!observerRef.current) return;

        console.log('Scroll detected, ensuring sections are observed');
        const sections = document.querySelectorAll('section[id]');
        sections.forEach(section => {
          observerRef.current.observe(section);
          console.log(`Observing section: ${section.id}`);
        });

        // Remove scroll listener after first scroll
        window.removeEventListener('scroll', handleScroll);
      };

      // Add scroll listener
      window.addEventListener('scroll', handleScroll, { passive: true });
  
      // After initial mount, mark as no longer initial load
      isInitialLoadRef.current = false;
  
      return () => {
        if (observerRef.current) {
          const sections = document.querySelectorAll('section[id]');
          sections.forEach(section => observerRef.current.unobserve(section));
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        window.removeEventListener('scroll', handleScroll);
      };
    }, [currentSection.id, updateCurrentSection]);
  
    return null;
  };

  const value = {
    theme,
    currentSection,  // Now expose the full section object
    sectionHistory, // Expose section history
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
