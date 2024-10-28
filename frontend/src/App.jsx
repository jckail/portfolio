import React, { useEffect } from 'react';
import './App.css';
import './theme.css';
import SidePanel from './components/SidePanel';
import TelemetryBanner from './telemetry/TelemetryBanner';
import Header from './components/Header';
import MainContent from './components/MainContent';
import SectionObserver from './components/SectionObserver';
import AdminHandler from './components/AdminHandler';
import { ResumeProvider, useResume } from './components/ResumeProvider';
import { AppLogicProvider, useAppLogic } from './components/AppLogicProvider';
import { ParticlesProvider } from './components/ParticlesProvider';
import { SidebarProvider, useSidebar } from './components/SidebarProvider';
import TelemetryCollector from './utils/TelemetryCollector';

function AppContent() {
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

function App() {
  return (
    <AppLogicProvider>
      <SidebarProvider>
        <ResumeProvider>
          <AppContent />
        </ResumeProvider>
      </SidebarProvider>
    </AppLogicProvider>
  );
}

export default App;
