import React, { Suspense, lazy, memo, useCallback, useRef, useState } from 'react';

import { useData } from '../../providers/data-provider';
import ProjectIcon from '../../../shared/components/project-icon/ProjectIcon';
import { buttonize } from '../../../shared/utils/a11y';
import { DataError } from '../../../shared/components/data-error';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { useDeepLink } from '../../../shared/hooks/use-deep-link';
import { getOwn } from '../../../shared/utils/lookup';
import { useProject } from './projects/hooks/useProject';
import { SkillModalHost } from './modals/SkillModalHost';
import { SectionPlaceholder } from './section-placeholder';
import { TechStackTags } from './tech-stack-tags';

import type { Project } from '../../../types/resume';
import type { SkillsData } from '../../../types/skills';
import '../../../styles/components/sections/projects.css';

const ProjectModal = lazy(() => import('./modals/ProjectModal'));

const prefetchProjectModal = () => import('./modals/ProjectModal');

const EMPTY_SKILLS: SkillsData = Object.freeze(Object.create(null));

/** Tags shown on a card; the modal lists the whole stack. */
const CARD_TAG_LIMIT = 4;

const ProjectCard = memo(({
  projectKey,
  project,
  skillsData,
  onSelect,
  onSelectSkill,
}: {
  projectKey: string;
  project: Project;
  skillsData: SkillsData;
  onSelect: (key: string) => void;
  onSelectSkill: (skillKey: string) => void;
}) => {
  const tags = project.tech_stack ?? [];
  return (
    <article className="project-card" onMouseEnter={prefetchProjectModal}>
      {/* Named by its visible content (title, description) plus a hidden
          suffix, not an aria-label that would leave the visible text out
          (Lighthouse label-content-name-mismatch). */}
      <div
        className="project-card-main"
        {...buttonize(() => onSelect(projectKey))}
      >
        <div className="project-image">
          <ProjectIcon
            name={project.logoPath || 'github-logo.svg'}
            size={48}
            aria-hidden
            className="project-icon"
          />
        </div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <span className="sr-only"> (view details)</span>
      </div>
      {tags.length > 0 && (
        <TechStackTags
          tags={tags.slice(0, CARD_TAG_LIMIT)}
          skillsData={skillsData}
          onSelectSkill={onSelectSkill}
        />
      )}
      <div className="project-links">
        <button
          type="button"
          className="project-link primary btn btn-sm"
          data-project-key={projectKey}
          onClick={() => onSelect(projectKey)}
        >
          View details
        </button>
        {project.link2 && (
          <a
            href={project.link2}
            target="_blank"
            rel="noopener noreferrer"
            className="project-link secondary btn btn-sm"
          >
            {project.link2_label || 'Live demo'}
          </a>
        )}
      </div>
    </article>
  );
});
ProjectCard.displayName = 'ProjectCard';

const Projects: React.FC = () => {
  const { projectsData, skillsData, isLoading, error } = useData();
  const { selectedProject, setSelectedProject } = useProject();
  // Local skill state (same pattern as Experience) so we don't fight the
  // Skills section's useSkill() owner of the ?skill= URL param.
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const closeProject = useCallback(() => setSelectedProject(null), [setSelectedProject]);
  // Project the skill dialog was opened from: focus returns to its card when
  // the skill closes, because the project dialog is gone by then.
  const skillOpenedFromRef = useRef<string | null>(null);
  // A ref, so the callback below stays stable and the memoised cards do not
  // re-render each time a project dialog opens.
  const selectedProjectRef = useRef(selectedProject);
  selectedProjectRef.current = selectedProject;
  const closeSkill = useCallback(() => {
    setSelectedSkill(null);
    const from = skillOpenedFromRef.current;
    skillOpenedFromRef.current = null;
    if (!from) return;
    requestAnimationFrame(() => {
      Array.from(document.querySelectorAll<HTMLElement>('[data-project-key]'))
        .find(button => button.dataset.projectKey === from)
        ?.focus({ preventScroll: true });
    });
  }, []);
  // Close the project first: one dialog at a time (audit F-3)
  const openSkillFromProject = useCallback(
    (skillKey: string) => {
      skillOpenedFromRef.current = selectedProjectRef.current;
      setSelectedProject(null);
      setSelectedSkill(skillKey);
    },
    [setSelectedProject]
  );

  useDeepLink({
    param: 'project',
    value: selectedProject,
    ready: !!projectsData,
    valid: !!getOwn(projectsData, selectedProject),
    sectionId: 'projects',
    clear: closeProject,
  });

  if (error) return <DataError what="the projects section" />;

  if (isLoading || !projectsData) {
    return <SectionPlaceholder id="projects" />;
  }

  const project = getOwn(projectsData, selectedProject);

  return (
    <section id="projects" className="section-container">
      <div className="section-header">
        <h2>Projects</h2>
      </div>
      <div className="section-content">
        <div className="projects-grid">
          {/* The data objects themselves, not per-render copies, so the
              memoised cards skip re-rendering when a modal opens. */}
          {Object.entries(projectsData).map(([key, item]) => (
            <ProjectCard
              key={key}
              projectKey={key}
              project={item}
              skillsData={skillsData ?? EMPTY_SKILLS}
              onSelect={setSelectedProject}
              onSelectSkill={openSkillFromProject}
            />
          ))}
        </div>
      </div>

      {project && selectedProject && (
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectModal
            projectKey={selectedProject}
            project={project}
            skillsData={skillsData ?? EMPTY_SKILLS}
            onClose={closeProject}
            onSelectSkill={openSkillFromProject}
          />
        </Suspense>
      )}

      <SkillModalHost skillsData={skillsData} skillKey={selectedSkill} onClose={closeSkill} />
    </section>
  );
};

export default Projects;
