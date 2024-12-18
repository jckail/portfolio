import React, { memo } from 'react';
import { useData } from '../../providers/data-provider';
import ProjectIcon from '../../../shared/components/project-icon/ProjectIcon';
import '../../../styles/components/sections/projects.css';

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const ProjectCard = memo(({ 
  project, 
  index 
}: { 
  project: {
    key: string;
    title: string;
    description: string;
    link: string;
    link2?: string;
    logoPath?: string;
  }; 
  index: number;
}) => {
  return (
    <div 
      className="project-card"
      style={{ '--item-index': index } as React.CSSProperties}
    >
      <div className="project-image">
        <ProjectIcon 
          name={project.logoPath || "github-logo.svg"}
          size={100}
          aria-label={`${project.title} project icon`}
          className="project-icon"
        />
      </div>
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
  );
});

const Projects: React.FC = () => {
  const { projectsData, isLoading, error } = useData();

  if (error) return <div className="error-message">Error: {error}</div>;

  if (isLoading || !projectsData) {
    return (
      <section id="projects" className="section-container">
        <div className="section-content">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // Convert projects object to array for rendering
  const projectsArray = Object.entries(projectsData).map(([key, project]) => ({
    ...project,
    key
  }));

  return (
    <section id="projects" className="section-container">
      <div className="section-header">
        <h2>Projects</h2>
      </div>
      <div className="section-content">
        <div className="projects-grid">
          {projectsArray.map((project, index) => (
            <ProjectCard
              key={project.key}
              project={project}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
