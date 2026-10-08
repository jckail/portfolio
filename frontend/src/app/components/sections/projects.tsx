import React, { Suspense, lazy, memo, useCallback, useRef, useState } from 'react';

import { useData } from '../../providers/data-provider';
import ProjectIcon from '../../../shared/components/project-icon/ProjectIcon';
import { buttonize } from '../../../shared/utils/a11y';
import { StatusBadge } from '../../../shared/components/brand/StatusBadge';
import { DataError } from '../../../shared/components/data-error';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { useDeepLink } from '../../../shared/hooks/use-deep-link';
import { getOwn } from '../../../shared/utils/lookup';
import { useProject } from './projects/hooks/useProject';
import { SkillModalHost } from './modals/SkillModalHost';
import { SectionPlaceholder } from './section-placeholder';
import { TechStackTags } from './tech-stack-tags';

import type { Project, ProjectCategory } from '../../../types/resume';
import type { SkillsData } from '../../../types/skills';
import '../../../styles/components/sections/projects.css';

const ProjectModal = lazy(() => import('./modals/ProjectModal'));

const prefetchProjectModal = () => import('./modals/ProjectModal');

const EMPTY_SKILLS: SkillsData = Object.freeze(Object.create(null));

/** Tags shown on a card; the modal lists the whole stack. */
const CARD_TAG_LIMIT = 4;
const CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: 'agents', label: 'AI agents' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'data', label: 'Data and reliability' },
  { id: 'devtools', label: 'Developer tools' },
  { id: 'knowledge', label: 'Knowledge graphs and AI' },
  { id: 'experimental', label: 'Open source and experiments' },
];

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
        {project.status && <StatusBadge tone={project.status === 'Live' ? 'success' : project.status === 'In Development' ? 'warning' : 'neutral'}>{project.status}</StatusBadge>}
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
  const [category, setCategory] = useState<ProjectCategory | 'all'>('all');
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
  const entries = Object.entries(projectsData);
  const featured = entries.filter(([, item]) => item.featured).slice(0, 3);
  const filtered = category === 'all' ? entries : entries.filter(([, item]) => item.categories?.includes(category));
  const renderCard = ([key, item]: [string, Project]) => (
    <ProjectCard key={key} projectKey={key} project={item}
      skillsData={skillsData ?? EMPTY_SKILLS} onSelect={setSelectedProject}
      onSelectSkill={openSkillFromProject} />
  );

  return (
    <section id="projects" className="section-container">
      <div className="section-header">
        <h2>Projects</h2>
      </div>
      <div className="section-content">
        {featured.length > 0 && (
          <div className="featured-projects" aria-labelledby="featured-projects-title">
            <h3 id="featured-projects-title">Featured engineering</h3>
            <p className="project-catalogue-intro">Selected case studies: the problem, the engineering decisions, and the evidence.</p>
            <div className="projects-grid">{featured.map(renderCard)}</div>
          </div>
        )}
        <div className="project-catalogue" aria-labelledby="project-catalogue-title">
          <h3 id="project-catalogue-title">Complete project catalogue</h3>
          <div className="project-filters" role="group" aria-label="Filter project catalogue">
            <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All projects</button>
            {CATEGORIES.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
          </div>
          <p className="project-count" role="status">{filtered.length} of {entries.length} projects{category !== 'all' ? ` in ${CATEGORIES.find(item => item.id === category)?.label}` : ''}</p>
          {filtered.length > 0 ? <div className="projects-grid">{filtered.map(renderCard)}</div> : (
            <p className="project-empty">No projects are published in this category yet. <button type="button" onClick={() => setCategory('all')}>Show all projects</button></p>
          )}
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
