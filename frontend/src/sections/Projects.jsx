import React, { forwardRef } from 'react';

const Projects = forwardRef(({ projects }, ref) => {
  return (
    <section ref={ref} id="projects" className="section projects-section">
      <h2>Projects</h2>
      <div className="projects-container">
        {projects?.map((project, index) => (
          <div key={index} className="project-item">
            <div className="project-header">
              <img src={`/api/images/matrix_style_laptop_icon.png`} alt="Project" className="project-icon" />
              <div className="project-content">
                <h3>{project.name}</h3>
                <p className="project-description">{project.description}</p>
                {project.technologies && (
                  <div className="technologies">
                    {project.technologies.map((tech, techIndex) => (
                      <span key={techIndex} className="technology-tag">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                    View Project
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

export default Projects;
