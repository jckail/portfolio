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
import { getApiUrl } from './utils/apiUtils'
import { useAppLogic } from './hooks/useAppLogic'
import { useGoogleAnalytics } from './utils/google-analytics'

const MainContent = React.memo(({ resumeData, sectionsRef }) => (
  <>
    <AboutMe aboutMe={resumeData.aboutMe} ref={el => sectionsRef.current['about-me'] = el} />
    <TechnicalSkills skills={resumeData.technicalSkills} ref={el => sectionsRef.current['technical-skills'] = el} />
    <Experience experience={resumeData.experience} ref={el => sectionsRef.current['experience'] = el} />
    <Projects projects={resumeData.projects} ref={el => sectionsRef.current['projects'] = el} />
    <MyResume ref={el => sectionsRef.current['my-resume'] = el} />
  </>
));

function App() {
  const {
    resumeData,
    error,
    theme,
    headerHeight,
    isSidebarOpen,
    isTemporarilyVisible,
    setHeaderHeight,
    toggleTheme,
    toggleSidebar,
    handleResumeClick
  } = useAppLogic()

  const headerRef = useRef(null)
  const sectionsRef = useRef({})
  const apiUrl = getApiUrl()
  const previousHeightRef = useRef(headerHeight)

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
    isTemporarilyVisible
  ])

  useEffect(() => {
    if (!resumeData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            window.history.replaceState(null, '', `#${sectionId}`);
          }
        });
      },
      {
        threshold: 0.1, // Changed from 0.5 to 0.1 to make it more sensitive
        rootMargin: '0px 0px -10% 0px' // Added rootMargin to trigger slightly before the section is fully in view
      }
    );

    document.querySelectorAll('.section').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [resumeData]);

  return (
    <div className="App app-wrapper">
      <div id="particles-js"></div>
      <div className={`app-content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
        <header className="floating-header" ref={headerRef}>
          <div className="header-left">
            <SandwichMenu onClick={toggleSidebar} />
            <div className="name-title">
              <h1>{resumeData?.name || 'Missing Name'}</h1>
              <h2>{resumeData?.title || 'Missing Title'}</h2>
            </div>
          </div>
          <div className="header-right">
            <HeaderNav resumeData={resumeData} theme={theme} onResumeClick={handleResumeClick} />
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>
        <SidePanel 
          isOpen={isSidebarOpen} 
          headerHeight={headerHeight} 
          onClose={toggleSidebar}
          isTemporarilyVisible={isTemporarilyVisible}
        />
        <main>
          {error && (
            <div>
              <p>Error: {error.message}</p>
              <p>Failed to fetch data from: {error.url}</p>
            </div>
          )}
          {!resumeData && !error && <div>Loading resume data...</div>}
          {resumeData && (
            <MainContent resumeData={resumeData} sectionsRef={sectionsRef} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
