import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import './theme.css'
import getParticlesConfig from './particlesConfig'
import { particleConfig, stylesConfig } from './configs'
import Layout from './components/Layout'
import AboutMe from './sections/AboutMe'
import TechnicalSkills from './sections/TechnicalSkills'
import Experience from './sections/Experience'
import Projects from './sections/Projects'
import MyResume from './sections/MyResume'
import { getApiUrl, downloadResume } from './helpers/utils'

function App() {
  const [resumeData, setResumeData] = useState(null)
  const [error, setError] = useState(null)
  const [particlesLoaded, setParticlesLoaded] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [currentSection, setCurrentSection] = useState('about-me')
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTemporarilyVisible, setIsTemporarilyVisible] = useState(false)
  const [isSidebarOpenedByScroll, setIsSidebarOpenedByScroll] = useState(false)
  const sectionsRef = useRef({})
  const timeoutRef = useRef(null)
  const apiUrl = getApiUrl();

  useEffect(() => {
    console.log('Fetching resume data from:', `${apiUrl}/api/resume_data`);
    fetch(`${apiUrl}/api/resume_data`)
      .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        console.log('Fetched resume data:', data);
        console.log('About Me data:', data.aboutMe);
        console.log('Technical Skills data:', data.technicalSkills);
        console.log('Experience data:', data.experience);
        console.log('Projects data:', data.projects);
        setResumeData(data)
      })
      .catch(error => {
        console.error('Error fetching resume data:', error)
        console.error('Error details:', error.message)
        setError(error.message)
      })
  }, [apiUrl])

  const updateParticlesConfig = useCallback(() => {
    const config = particleConfig[theme]
    return getParticlesConfig(
      config.background_color,
      config.particle_color,
      config.line_color
    )
  }, [theme])

  useEffect(() => {
    if (window.particlesJS && !particlesLoaded) {
      window.particlesJS('particles-js', updateParticlesConfig())
      setParticlesLoaded(true)
    } else if (window.particlesJS && particlesLoaded) {
      window.pJSDom[0].pJS.fn.vendors.destroypJS()
      window.pJSDom = []
      window.particlesJS('particles-js', updateParticlesConfig())
    }
  }, [particlesLoaded, updateParticlesConfig])

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : ''
  }, [theme])

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    let newCurrentSection = 'about-me';

    Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
      if (sectionRef && scrollPosition >= sectionRef.offsetTop - headerHeight - 10) {
        newCurrentSection = sectionId;
      }
    });

    if (newCurrentSection !== currentSection) {
      setCurrentSection(newCurrentSection);
      window.history.replaceState(null, '', `#${newCurrentSection}`);
    }

    if (!isSidebarOpen) {
      setIsTemporarilyVisible(true);
      setIsSidebarOpenedByScroll(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsTemporarilyVisible(false);
        setIsSidebarOpenedByScroll(false);
      }, 1000);
    }
  }, [headerHeight, isSidebarOpen, currentSection]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleScroll]);

  const scrollToSection = useCallback((sectionId, headerHeight, updateUrl = true) => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: targetPosition - headerHeight
      });
      if (updateUrl) {
        window.history.pushState(null, '', `#${sectionId}`);
      }
      setCurrentSection(sectionId);
    }
  }, []);

  const handleInitialScroll = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sectionsRef.current[hash] && headerHeight > 0) {
      scrollToSection(hash, headerHeight, false);
    }
  }, [headerHeight, scrollToSection]);

  useEffect(() => {
    if (resumeData && headerHeight > 0) {
      handleInitialScroll();
      handleScroll();
    }
  }, [resumeData, headerHeight, handleInitialScroll, handleScroll]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState)
    if (isSidebarOpen && !isSidebarOpenedByScroll) {
      // If closing the sidebar and it wasn't opened by scroll, immediately set isTemporarilyVisible to false
      setIsTemporarilyVisible(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    // Reset the isSidebarOpenedByScroll state when manually toggling
    setIsSidebarOpenedByScroll(false);
  }

  const handleResumeClick = (event) => {
    event.preventDefault();
    scrollToSection('my-resume', headerHeight);
    downloadResume();
  }

  return (
    <Layout
      resumeData={resumeData}
      theme={theme}
      toggleTheme={toggleTheme}
      currentSection={currentSection}
      headerHeight={headerHeight}
      setHeaderHeight={setHeaderHeight}
      isSidebarOpen={isSidebarOpen}
      isTemporarilyVisible={isTemporarilyVisible}
      toggleSidebar={toggleSidebar}
      handleResumeClick={handleResumeClick}
      scrollToSection={scrollToSection}
    >
      {error && <div>Error: {error}</div>}
      {!resumeData && <div>Loading resume data...</div>}
      {resumeData && (
        <>
          <AboutMe aboutMe={resumeData.aboutMe} ref={el => sectionsRef.current['about-me'] = el} />
          <TechnicalSkills skills={resumeData.technicalSkills} ref={el => sectionsRef.current['technical-skills'] = el} />
          <Experience experience={resumeData.experience} ref={el => sectionsRef.current['experience'] = el} />
          <Projects projects={resumeData.projects} ref={el => sectionsRef.current['projects'] = el} />
          <MyResume ref={el => sectionsRef.current['my-resume'] = el} />
        </>
      )}
    </Layout>
  )
}

export default App
