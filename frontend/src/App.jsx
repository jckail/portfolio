import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import './theme.css'
import getParticlesConfig from './particlesConfig'
import { particleConfig, stylesConfig } from './configs'

function App() {
  const [resumeData, setResumeData] = useState(null)
  const [error, setError] = useState(null)
  const [particlesLoaded, setParticlesLoaded] = useState(false)
  const [theme, setTheme] = useState('dark')

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

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="App">
      <div id="particles-js"></div>
      <div className="content">
        <header className="floating-header">
          <div className="header-left">
            <img src="/images/home.jpg" alt="Jordan Kail" className="avatar" />
            <div className="name-title">
              <h1>{resumeData?.name || 'Jordan Kail'}</h1>
              <h2>{resumeData?.title || 'Software Engineer'}</h2>
            </div>
          </div>
          <div className="header-right">
            <nav>
              {resumeData?.github && <a href={resumeData.github} target="_blank" rel="noopener noreferrer"><img src="/images/github.jpg" alt="GitHub" className="icon" /></a>}
              {resumeData?.linkedin && <a href={resumeData.linkedin} target="_blank" rel="noopener noreferrer"><img src="/images/linkedin.jpg" alt="LinkedIn" className="icon" /></a>}
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/download_resume`} target="_blank" rel="noopener noreferrer" className="resume-link">Resume</a>
            </nav>
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>
        <main>
          {error && <div>Error: {error}</div>}
          {!resumeData && <div>Loading resume data...</div>}
          {resumeData && (
            <>
              {resumeData.technicalSkills && (
                <section id="technical-skills">
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
                <section id="experience">
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
                <section id="projects">
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
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
