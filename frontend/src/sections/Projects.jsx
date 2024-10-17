import React, { forwardRef } from 'react'
import { getApiUrl } from '../helpers/utils'

const Projects = forwardRef(({ projects }, ref) => {
  const apiUrl = getApiUrl();

  return (
    <section id="projects" ref={ref}>
      <h2>Projects</h2>
      {projects.map((project, index) => (
        <div key={index} className="project">
          <img src={`${apiUrl}/images/project-img.jpg`} alt="Project" className="project-icon" />
          <div>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer">View Project</a>}
          </div>
        </div>
      ))}
    </section>
  )
})

export default Projects
