import React, { useRef, useEffect } from 'react'
import './App.css'
import './theme.css'
import SandwichMenu from './components/SandwichMenu'
import SidePanel from './components/SidePanel'
import HeaderNav from './components/HeaderNav'
import BrowserBanner from './components/BrowserBanner'
import AboutMe from './sections/AboutMe'
import TechnicalSkills from './sections/TechnicalSkills'
import Experience from './sections/Experience'
import Projects from './sections/Projects'
import MyResume from './sections/MyResume'
import { ResumeProvider, useResume } from './components/ResumeProvider'
import { AppLogicProvider, useAppLogic } from './components/AppLogicProvider'
import { ParticlesProvider } from './components/ParticlesProvider'
import { useGoogleAnalytics } from './utils/google-analytics'

function AppContent() {
  const {
    theme,
    currentSection,
    headerHeight,
    isSidebarOpen,
    isTemporarilyVisible,
    sectionsRef,
    setHeaderHeight,
    toggleTheme,
    toggleSidebar,
    handleSectionClick,
    handleButtonClick,
    updateParticlesConfig
  } = useAppLogic();

  const {
    resumeData,
    error,
    handleDownload
  } = useResume();

  const headerRef = useRef(null);
  const previousHeightRef = useRef(headerHeight);

  // Initialize Google Analytics
  useGoogleAnalytics();

  useEffect(() => {
    if (headerRef.current) {
      const newHeight = headerRef.current.offsetHeight;
      // Only update if the height has actually changed
      if (newHeight !== previousHeightRef.current) {
        previousHeightRef.current = newHeight;
        setHeaderHeight(newHeight);
      }
    }
  }, [
    // Dependencies that could affect header height
    resumeData?.name,
    resumeData?.title,
    isSidebarOpen,
    isTemporarilyVisible,
    setHeaderHeight
  ]);

  const handleResumeClick = (event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    handleDownload();
  };

  return (
    <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
      <div className="App app-wrapper">
        <BrowserBanner />
        <div id="particles-js"></div>
        <div className={`app-content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
          <header className="floating-header" ref={headerRef}>
            <div className="header-left">
              <SandwichMenu onClick={toggleSidebar} />
              <div className="name-title">
                <h1>{resumeData?.name || 'Loading...'}</h1>
                <h2>{resumeData?.title || ''}</h2>
              </div>
            </div>
            <div className="header-right">
              <HeaderNav 
                theme={theme} 
                onResumeClick={handleResumeClick} 
              />
              <button onClick={toggleTheme} className="theme-toggle">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </header>
          <SidePanel 
            isOpen={isSidebarOpen} 
            currentSection={currentSection} 
            headerHeight={headerHeight} 
            onClose={toggleSidebar}
            isTemporarilyVisible={isTemporarilyVisible}
            handleSectionClick={handleSectionClick}
          />
          <main>
            {error && (
              <div className="error-message">
                <p>Error: {error}</p>
              </div>
            )}
            {!resumeData && !error && <div className="loading">Loading resume data...</div>}
            {resumeData && (
              <>
                <AboutMe aboutMe={resumeData.aboutMe} ref={el => sectionsRef.current['about-me'] = el} />
                <TechnicalSkills skills={resumeData.technicalSkills} ref={el => sectionsRef.current['technical-skills'] = el} />
                <Experience experience={resumeData.experience} ref={el => sectionsRef.current['experience'] = el} />
                <Projects projects={resumeData.projects} ref={el => sectionsRef.current['projects'] = el} />
                <MyResume ref={el => sectionsRef.current['my-resume'] = el} />
              </>
            )}
          </main>
        </div>
      </div>
    </ParticlesProvider>
  );
}

function App() {
  return (
    <AppLogicProvider>
      <ResumeProvider>
        <AppContent />
      </ResumeProvider>
    </AppLogicProvider>
  );
}

export default App
