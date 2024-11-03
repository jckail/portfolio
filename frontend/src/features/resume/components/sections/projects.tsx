import React from 'react';
import { ResumeData } from '@/features/resume/types';
import '@/features/resume/styles/projects.css';

interface ProjectsProps {
  projects: ResumeData['projects'];
}

const Projects: React.FC<ProjectsProps> = ({ projects = [] }) => {
  return (
    <section id="projects" className="section">
      <h2>Projects</h2>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <div 
            key={index} 
            className="project-card"
            style={{ '--item-index': index } as React.CSSProperties}
          >
            <div className="project-content">
              <h3>
                <a href={project.link} target="_blank" rel="noopener noreferrer">
                  {project.title}
                </a>
              </h3>
              <p>{project.description}</p>
              <div className="project-links">
                <a 
                  href={project.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="project-link primary"
                >
                  View Project
                </a>
                {project.link2 && (
                  <a 
                    href={project.link2} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="project-link secondary"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Projects;
