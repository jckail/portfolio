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
import { getApiUrl, downloadResume, scrollToSection as utilsScrollToSection } from './helpers/utils'

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
  const isScrolling = useRef(false)
  const apiUrl = getApiUrl();

  useEffect(() => {
    const fullApiUrl = `${apiUrl}/api/resume_data`;
    fetch(fullApiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        setResumeData(data)
      })
      .catch(error => {
        console.error('Error fetching resume data:', error)
        setError(`Failed to fetch resume data: ${error.message}`)
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

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const handleScroll = useCallback(debounce(() => {
    if (isScrolling.current) return;

    const scrollPosition = window.scrollY + headerHeight + 50; // Add some offset
    let newCurrentSection = 'about-me';

    Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
      if (sectionRef && scrollPosition >= sectionRef.offsetTop) {
        newCurrentSection = sectionId;
      }
    });

    if (newCurrentSection !== currentSection) {
      console.log('Updating current section to:', newCurrentSection);
      setCurrentSection(newCurrentSection);
      const newUrl = `#${newCurrentSection}`;
      if (window.location.hash !== newUrl) {
        window.history.pushState(null, '', newUrl);
        console.log('Updated URL:', window.location.href);
      }
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
  }, 100), [headerHeight, isSidebarOpen, currentSection]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleScroll]);

  const scrollToSection = useCallback((sectionId) => {
    console.log('scrollToSection called with sectionId:', sectionId);
    if (sectionsRef.current[sectionId]) {
      isScrolling.current = true;
      const yOffset = -headerHeight;
      const element = sectionsRef.current[sectionId];
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({top: y, behavior: 'smooth'});
      setCurrentSection(sectionId);
      window.history.pushState(null, '', `#${sectionId}`);

      // Reset isScrolling after animation completes
      setTimeout(() => {
        isScrolling.current = false;
      }, 1000); // Adjust this value based on your scroll animation duration
    } else {
      console.error(`Section with id ${sectionId} not found`);
    }
  }, [headerHeight]);

  const handleInitialScroll = useCallback(() => {
    const hash = window.location.hash.slice(1);
    console.log('handleInitialScroll called, hash:', hash);
    if (hash && sectionsRef.current[hash] && headerHeight > 0) {
      console.log('Scrolling to initial section:', hash);
      setTimeout(() => {
        scrollToSection(hash);
      }, 100); // Small delay to ensure everything is rendered
    } else {
      console.log('No initial scroll needed or section not found');
    }
  }, [headerHeight, scrollToSection]);

  useEffect(() => {
    if (resumeData && headerHeight > 0) {
      console.log('Resume data loaded and header height set, calling handleInitialScroll');
      handleInitialScroll();
    }
  }, [resumeData, headerHeight, handleInitialScroll]);

  useEffect(() => {
    const handlePopState = (event) => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionsRef.current[hash]) {
        scrollToSection(hash);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [scrollToSection]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState)
    if (isSidebarOpen && !isSidebarOpenedByScroll) {
      setIsTemporarilyVisible(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    setIsSidebarOpenedByScroll(false);
  }

  const handleResumeClick = (event) => {
    event.preventDefault();
    scrollToSection('my-resume');
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
