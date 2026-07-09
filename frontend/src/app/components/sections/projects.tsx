import React, { lazy, Suspense, memo } from 'react';

import { useData } from '../../providers/data-provider';
import ProjectIcon from '../../../shared/components/project-icon/ProjectIcon';
import { buttonize } from '../../../shared/utils/a11y';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { useProject } from './projects/hooks/useProject';

import type { Project } from '../../../types/resume';
import '../../../styles/components/sections/projects.css';

const ProjectModal = lazy(() => import('./modals/ProjectModal'));
const SkillModal = lazy(() => import('./modals/SkillModal'));

const prefetchProjectModal = () => import('./modals/ProjectModal');

const ProjectCard = memo(({
  projectKey,
  project,
  index,
  onSelect,
}: {
  projectKey: string;
  project: Project;
  index: number;
  onSelect: (key: string) => void;
}) => {
  return (
    <div
      className="project-card"
      style={{ '--item-index': index } as React.CSSProperties}
      onMouseEnter={prefetchProjectModal}
    >
      <div
        className="project-card-main"
        aria-label={`View ${project.title} details`}
        {...buttonize(() => onSelect(projectKey))}
      >
        <div className="project-image">
          <ProjectIcon
            name={project.logoPath || 'github-logo.svg'}
            size={100}
            aria-label={`${project.title} project icon`}
            className="project-icon"
          />
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
      <div className="project-links">
        <button
          type="button"
          className="project-link primary"
          onClick={() => onSelect(projectKey)}
        >
          View details
        </button>
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
ProjectCard.displayName = 'ProjectCard';

const Projects: React.FC = () => {
  const { projectsData, skillsData, isLoading, error } = useData();
  const { selectedProject, setSelectedProject } = useProject();
  // Local skill state (same pattern as Experience) so we don't fight the
  // Skills section's useSkill() owner of the ?skill= URL param.
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);

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

  const projectsArray = Object.entries(projectsData).map(([key, project]) => ({
    ...project,
    key,
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
              projectKey={project.key}
              project={project}
              index={index}
              onSelect={setSelectedProject}
            />
          ))}
        </div>
      </div>

      {selectedProject && projectsData[selectedProject] && (
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectModal
            projectKey={selectedProject}
            project={projectsData[selectedProject]}
            skillsData={skillsData ?? {}}
            onClose={() => setSelectedProject(null)}
            onSelectSkill={skillKey => {
              setSelectedProject(null);
              setSelectedSkill(skillKey);
            }}
          />
        </Suspense>
      )}

      {selectedSkill && skillsData?.[selectedSkill] && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            skillKey={selectedSkill}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default Projects;
