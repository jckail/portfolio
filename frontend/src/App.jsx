import React, { useEffect } from 'react';
import './App.css';
import './theme.css';
import SandwichMenu from './components/SandwichMenu';
import SidePanel from './components/SidePanel';
import HeaderNav from './components/HeaderNav';
import BrowserBanner from './components/BrowserBanner';
import AboutMe from './sections/AboutMe';
import TechnicalSkills from './sections/TechnicalSkills';
import Experience from './sections/Experience';
import Projects from './sections/Projects';
import MyResume from './sections/MyResume';
import { ResumeProvider, useResume } from './components/ResumeProvider';
import { AppLogicProvider, useAppLogic } from './components/AppLogicProvider';
import { ParticlesProvider } from './components/ParticlesProvider';
import { SidebarProvider, useSidebar } from './components/SidebarProvider';


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

  const handleResumeClick = (event) => {
    event.preventDefault();
    handleButtonClick('my-resume');
    handleDownload();
  };

  useEffect(() => {
    if (!resumeData) return; // Only setup observer after content is loaded

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              window.history.replaceState(null, '', `#${sectionId}`);
              console.log('Updated URL for section:', sectionId);
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-50px 0px -50px 0px'
      }
    );

    // Find all sections with IDs
    const sections = document.querySelectorAll('section[id]');
    console.log('Found sections:', sections.length);
    
    sections.forEach((section) => {
      observer.observe(section);
      console.log('Observing section:', section.id);
    });

    return () => {
      sections.forEach(section => observer.unobserve(section));
      observer.disconnect();
    };
  }, [resumeData]); // Re-run when resumeData changes

  return (
    <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
      <div className="App app-wrapper">
        <BrowserBanner />
        <div id="particles-js"></div>
        <div className={`app-content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
          <header className="floating-header">
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
                <AboutMe aboutMe={resumeData.aboutMe} ref={el => setSectionRef('about-me', el)} />
                <TechnicalSkills skills={resumeData.technicalSkills} ref={el => setSectionRef('technical-skills', el)} />
                <Experience experience={resumeData.experience} ref={el => setSectionRef('experience', el)} />
                <Projects projects={resumeData.projects} ref={el => setSectionRef('projects', el)} />
                <MyResume ref={el => setSectionRef('my-resume', el)} />
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
      <SidebarProvider>
        <ResumeProvider>
          <AppContent />
        </ResumeProvider>
      </SidebarProvider>
    </AppLogicProvider>
  );
}

export default App;

