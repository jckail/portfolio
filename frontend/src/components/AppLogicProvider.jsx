import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
    updateParticlesConfig
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

  const handleResumeClick = useCallback((event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    handleDownload();
  }, [handleButtonClick, handleDownload]);

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
      <SectionObserver />
    </ParticlesProvider>
  );
}

export function AppLogicProvider({ children }) {
  // Determine the initial source based on navigation type
  const getInitialSource = () => {
    const hasReferrer = document.referrer !== '';
    const hasHash = window.location.hash !== '';
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
  const isInitialLoadRef = useRef(true);

  // Create debounced URL update function
  const debouncedUpdateUrl = useRef(
    debounce((sectionId) => {
      window.history.replaceState(null, '', `#${sectionId}`);
    }, 1000)
  ).current;

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateUrl.cancel();
    };
  }, [debouncedUpdateUrl]);

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
    setCurrentSection({ id: sectionId, source });
  }, []);

  // Update section history when currentSection changes
  useEffect(() => {
    setSectionHistory(prev => {
      const newHistory = [...prev];
      if (currentSection.id !== (newHistory[0]?.id)) {
        newHistory.unshift(currentSection);
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
    isManualNavigationRef.current = true;
    
    updateCurrentSection(sectionId, source);
    
    requestAnimationFrame(() => {
      const element = sectionsRef.current[sectionId];
      if (element) {
        element.scrollIntoView({ behavior: 'instant' });
      }
      
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 1000);
    });
  }, [updateCurrentSection]);

  // Handle button click (used for resume download)
  const handleButtonClick = useCallback((sectionId) => {
    updateCurrentSection(sectionId, 'button');
  }, [updateCurrentSection]);

  const value = useMemo(() => ({
    theme,
    currentSection,
    sectionHistory,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig
  }), [
    theme,
    currentSection,
    sectionHistory,
    setSectionRef,
    toggleTheme,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig
  ]);

  return (
    <AppLogicContext.Provider value={{ ...value, isManualNavigationRef, isInitialLoadRef, updateCurrentSection }}>
      {children}
    </AppLogicContext.Provider>
  );
}

const SectionObserver = () => {
  const { currentSection, updateCurrentSection, isManualNavigationRef, isInitialLoadRef } = useAppLogic();

  // Create debounced update function
  const debouncedSectionUpdate = useRef(
    debounce((sectionId) => {
      updateCurrentSection(sectionId, 'observer');
    }, 2000)
  ).current;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualNavigationRef.current) {
          return;
        }
        
        const visibleEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        
        if (visibleEntries.length > 0) {
          const mostVisibleEntry = visibleEntries[0];
          const sectionId = mostVisibleEntry.target.id;
          
          if (sectionId && currentSection.id !== sectionId) {
            debouncedSectionUpdate(sectionId);
          }
        }
      },
      {
        threshold: [0.1, 0.2, 0.3],
        rootMargin: '-10% 0px -10% 0px'
      }
    );

    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      sections.forEach(section => {
        observer.observe(section);
      });

      window.removeEventListener('scroll', handleScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    isInitialLoadRef.current = false;

    return () => {
      const sections = document.querySelectorAll('section[id]');
      sections.forEach(section => observer.unobserve(section));
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      debouncedSectionUpdate.cancel(); // Cleanup debounced function
    };
  }, [currentSection.id, updateCurrentSection, isManualNavigationRef, isInitialLoadRef, debouncedSectionUpdate]);

  return null;
};
