import React from 'react';

interface Project {
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
  github?: string;
  image?: string;
}

interface ProjectsProps {
  projects?: Project[];
}

export function Projects({ projects }: ProjectsProps) {
  if (!projects?.length) return null;

  return (
    <section id="projects" className="section">
      <div className="container">
        <h2>Projects</h2>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <div key={index} className="project-card">
              {project.image && (
                <div className="project-image">
                  <img src={project.image} alt={project.name} />
                </div>
              )}
              <div className="project-content">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="project-technologies">
                    {project.technologies.map((tech, i) => (
                      <span key={i} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                )}
                <div className="project-links">
                  {project.link && (
                    <a 
                      href={project.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      View Project
                    </a>
                  )}
                  {project.github && (
                    <a 
                      href={project.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="project-github"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
