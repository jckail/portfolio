import React, { forwardRef } from 'react'

const Projects = forwardRef(({ projects }, ref) => {
  return (
    <section id="projects" ref={ref}>
      <div className="content-wrapper">
        <h2>Projects</h2>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <div key={index} className="project-item">
              <img src="/images/project-img.jpg" alt="Project" className="project-icon" />
              <div className="project-content">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                    View Project
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default Projects
