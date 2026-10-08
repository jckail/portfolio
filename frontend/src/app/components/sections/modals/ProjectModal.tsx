import React, { useEffect, useId, useMemo } from 'react';

import ProjectIcon from '../../../../shared/components/project-icon/ProjectIcon';
import { StatusBadge } from '../../../../shared/components/brand/StatusBadge';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackModalView } from '../../../../shared/utils/analytics';
import { shareUrl } from '../../../../shared/utils/url-params';
import { TechStackTags } from '../tech-stack-tags';
import { CaseStudy } from '../projects/CaseStudy';

import type { Project } from '../../../../types/resume';
import type { SkillsData } from '../../../../types/skills';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/reading-progress.css';

interface ProjectModalProps {
  projectKey: string;
  project: Project;
  skillsData: SkillsData;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

function buildStory(project: Project) {
  const steps: { label: string; text: string }[] = [];
  if (project.description?.trim()) {
    steps.push({ label: 'Snapshot', text: project.description.trim() });
  }
  const detail = project.description_detail?.trim();
  if (!project.case_study && detail && detail !== project.description?.trim()) {
    steps.push({ label: 'Story', text: detail });
  }
  if (project.maturity_note) steps.push({ label: 'Maturity', text: project.maturity_note });
  if (project.contribution) steps.push({ label: 'My contribution', text: project.contribution });
  if (project.evidence) steps.push({ label: 'Evidence', text: project.evidence });
  if (project.tech_stack && project.tech_stack.length > 0) {
    steps.push({
      label: 'Stack',
      text: project.tech_stack.slice(0, 8).join(' · '),
    });
  }
  if (project.last_commit) {
    steps.push({ label: 'Updated', text: project.last_commit });
  }
  return steps;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  projectKey,
  project,
  skillsData,
  onClose,
  onSelectSkill,
}) => {
  const titleId = useId();

  useEffect(() => {
    trackModalView(projectKey, 'project', project.title);
  }, [projectKey, project.title]);

  const story = useMemo(() => buildStory(project), [project]);
  const detail =
    [project.description_detail?.trim() || project.description, project.contribution && `My contribution: ${project.contribution}`, project.evidence && `Evidence: ${project.evidence}`].filter(Boolean).join('\n\n');

  return (
    <DialogShell
      overlayClassName="skill-modal-overlay"
      className="skill-modal-content project-modal-content"
      labelledBy={titleId}
      onClose={onClose}
      closeButton
    >
      <div className="modal-header">
        <h2 id={titleId}>{project.title}</h2>
        <div className="modal-icon-wrapper">
          <div className="icon-wrapper">
            <ProjectIcon
              name={project.logoPath || 'github-logo.svg'}
              className="modal-skill-icon"
              size={48}
              aria-label={project.title}
            />
          </div>
        </div>
      </div>
      <div className="modal-body">
        {project.status && <StatusBadge tone={project.status === 'Live' ? 'success' : project.status === 'In Development' ? 'warning' : 'neutral'}>{project.status}</StatusBadge>}
        {story.length > 1 ? (
          <div className="project-story" aria-label="Project story">
            {story.map(step => (
              <div key={step.label} className="project-story-step">
                <span className="project-story-label">{step.label}</span>
                <p className="project-story-text">{step.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="skill-description">{detail}</p>
        )}

        {project.case_study && <CaseStudy study={project.case_study} />}

        {project.tech_stack && project.tech_stack.length > 0 && (
          <TechStackTags
            tags={project.tech_stack}
            skillsData={skillsData}
            onSelectSkill={onSelectSkill}
          />
        )}

        <div className="project-modal-actions">
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="visit-website-btn"
          >
            {project.link_label || 'View project'}
          </a>
          {project.link2 && project.link2 !== project.link && (
            <a
              href={project.link2}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-website-btn project-modal-secondary"
            >
              {project.link2_label || 'Live demo'}
            </a>
          )}
          <CopyLinkButton url={shareUrl('project', projectKey)} />
        </div>
      </div>
    </DialogShell>
  );
};

export default ProjectModal;
