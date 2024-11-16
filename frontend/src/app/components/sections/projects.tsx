import React, { useState, useEffect } from 'react';
import { ProjectsData } from '../../../types/resume';
import { useLoading } from '../../../shared/context/loading-context';
import '../../../styles/features/sections/projects.css';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<ProjectsData>({});
  const [error, setError] = useState<string | null>(null);
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    let mounted = true;

    const fetchProjects = async () => {
      try {
        setComponentLoading('projects', true);
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch Projects');
        const data = await response.json();
        if (mounted) {
          setProjects(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load Projects');
        }
      } finally {
        if (mounted) {
          setComponentLoading('projects', false);
        }
      }
    };

    fetchProjects();

    return () => {
      mounted = false;
    };
  }, [setComponentLoading]);

  if (error) return <div className="error-message">Error: {error}</div>;

  // Convert projects object to array for rendering
  const projectsArray = Object.entries(projects).map(([key, project]) => ({
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
            <div 
              key={project.key} 
              className="project-card"
              style={{ '--item-index': index } as React.CSSProperties}
            >
                <div className="project-image">
                  <img 
                    src={project.logoPath || "/images/projects/github-logo.svg"}
                    alt={`${project.title} project image`}
                    loading="lazy"
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
