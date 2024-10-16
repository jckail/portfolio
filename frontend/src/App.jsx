import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import './theme.css'
import getParticlesConfig from './particlesConfig'
import { particleConfig, stylesConfig } from './configs'
import ResumePDF from './ResumePDF'

function SandwichMenu({ onClick }) {
  return (
    <button className="sandwich-menu" onClick={onClick}>
      <div></div>
      <div></div>
      <div></div>
    </button>
  )
}

function SidePanel({ isOpen, currentSection, headerHeight, onClose, isTemporarilyVisible }) {
  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      // Update URL hash
      window.history.pushState(null, '', `#${targetId}`);
    }
    onClose();
  };

  return (
    <div className={`side-panel ${isOpen || isTemporarilyVisible ? 'open' : ''}`} style={{ paddingTop: `${headerHeight}px` }}>
      <div className="side-panel-content">
        <h3>🔍</h3>
        <nav>
          <a 
            href="#technical-skills" 
            onClick={(e) => handleNavClick(e, 'technical-skills')}
            className={currentSection === 'technical-skills' ? 'active' : ''}
          >
            Technical Skills
          </a>
          <a 
            href="#experience" 
            onClick={(e) => handleNavClick(e, 'experience')}
            className={currentSection === 'experience' ? 'active' : ''}
          >
            Experience
          </a>
          <a 
            href="#projects" 
            onClick={(e) => handleNavClick(e, 'projects')}
            className={currentSection === 'projects' ? 'active' : ''}
          >
            Projects
          </a>
          <a 
            href="#my-resume" 
            onClick={(e) => handleNavClick(e, 'my-resume')}
            className={currentSection === 'my-resume' ? 'active' : ''}
          >
            My Resume
          </a>
        </nav>
      </div>
    </div>
  )
}

function HeaderNav({ resumeData, theme, onResumeClick }) {
  return (
    <nav className="header-nav">
      {resumeData?.github && (
        <a href={resumeData.github} target="_blank" rel="noopener noreferrer">
          <img 
            src={theme === 'light' ? "/images/light_mode_github.png" : "/images/dark_mode_github.png"} 
            alt="GitHub" 
            className="icon" 
          />
        </a>
      )}
      {resumeData?.linkedin && (
        <a href={resumeData.linkedin} target="_blank" rel="noopener noreferrer">
          <img 
            src={theme === 'light' ? "/images/light_mode_linkedin.png" : "/images/dark_mode_linkedin.png"} 
            alt="LinkedIn" 
            className="icon" 
          />
        </a>
      )}
      <a href="#my-resume" onClick={onResumeClick} className="resume-link">See My Resume</a>
    </nav>
  )
}

function App() {
  const [resumeData, setResumeData] = useState(null)
  const [error, setError] = useState(null)
  const [particlesLoaded, setParticlesLoaded] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [currentSection, setCurrentSection] = useState('technical-skills')
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTemporarilyVisible, setIsTemporarilyVisible] = useState(false)
  const headerRef = useRef(null)
  const sectionsRef = useRef({})
  const timeoutRef = useRef(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${apiUrl}/api/resume_data`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => setResumeData(data))
      .catch(error => {
        console.error('Error fetching resume data:', error)
        setError(error.message)
      })
  }, [])

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

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

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      let currentActiveSection = 'technical-skills';

      Object.entries(sectionsRef.current).forEach(([sectionId, sectionRef]) => {
        if (sectionRef && scrollPosition >= sectionRef.offsetTop - headerHeight - 10) {
          currentActiveSection = sectionId;
        }
      });

      setCurrentSection(currentActiveSection);

      if (!isSidebarOpen) {
        setIsTemporarilyVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsTemporarilyVisible(false);
        }, 1000);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [headerHeight, isSidebarOpen]);

  // Handle initial navigation based on URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sectionsRef.current[hash]) {
      const targetPosition = sectionsRef.current[hash].offsetTop;
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
    }
  }, [headerHeight]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleResumeClick = (event) => {
    event.preventDefault();
    
    // Scroll to the "My Resume" section
    const resumeSection = document.getElementById('my-resume');
    if (resumeSection) {
      const targetPosition = resumeSection.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: targetPosition - headerHeight,
        behavior: 'smooth'
      });
      // Update URL hash
      window.history.pushState(null, '', '#my-resume');
    }

    // Initiate resume download
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const downloadUrl = `${apiUrl}/api/download_resume`;
    
    // Create a temporary anchor element to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = 'JordanKailResume.pdf'; // Set the desired filename
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  return (
    <div className="App">
      <div id="particles-js"></div>
      <div className={`content ${isSidebarOpen || isTemporarilyVisible ? 'sidebar-open' : ''}`}>
        <header className="floating-header" ref={headerRef}>
          <div className="header-left">
            <SandwichMenu onClick={toggleSidebar} />
            <div className="name-title">
              <h1>{resumeData?.name || 'Jordan Kail'}</h1>
              <h2>{resumeData?.title || 'Software Engineer'}</h2>
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
          currentSection={currentSection} 
          headerHeight={headerHeight} 
          onClose={toggleSidebar}
          isTemporarilyVisible={isTemporarilyVisible}
        />
        <main>
          {error && <div>Error: {error}</div>}
          {!resumeData && <div>Loading resume data...</div>}
          {resumeData && (
            <>
              {resumeData.technicalSkills && (
                <section id="technical-skills" ref={el => sectionsRef.current['technical-skills'] = el}>
                  <h2>Technical Skills</h2>
                  <ul>
                    {resumeData.technicalSkills.map((skill, index) => (
                      <li key={index}>
                        <img src={`/images/key-skill-icon-${(index % 3) + 1}.svg`} alt="Skill Icon" className="skill-icon" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {resumeData.experience && (
                <section id="experience" ref={el => sectionsRef.current['experience'] = el}>
                  <h2>Experience</h2>
                  {resumeData.experience.map((job, index) => (
                    <div key={index} className="job">
                      <img src="/images/work-img.jpg" alt="Work" className="job-icon" />
                      <div>
                        <h3>{job.title} at {job.company}</h3>
                        <p>{job.date}</p>
                        <ul>
                          {job.responsibilities.map((resp, i) => (
                            <li key={i}>{resp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </section>
              )}
              {resumeData.projects && (
                <section id="projects" ref={el => sectionsRef.current['projects'] = el}>
                  <h2>Projects</h2>
                  {resumeData.projects.map((project, index) => (
                    <div key={index} className="project">
                      <img src="/images/project-img.jpg" alt="Project" className="project-icon" />
                      <div>
                        <h3>{project.title}</h3>
                        <p>{project.description}</p>
                        {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer">View Project</a>}
                      </div>
                    </div>
                  ))}
                </section>
              )}
              <section id="my-resume" ref={el => sectionsRef.current['my-resume'] = el}>
                <h2>My Resume</h2>
                <ResumePDF />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
