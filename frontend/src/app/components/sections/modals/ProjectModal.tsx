import React, { useEffect } from 'react';

import ProjectIcon from '../../../../shared/components/project-icon/ProjectIcon';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { buttonize } from '../../../../shared/utils/a11y';
import { findSkillKey } from '../../../../shared/utils/skills';
import { trackModalView } from '../../../../shared/utils/analytics';
import { useEscapeKey } from '../../../../shared/hooks/use-escape-key';
import { useFocusTrap } from '../../../../shared/hooks/use-focus-trap';

import type { Project } from '../../../../types/resume';
import type { Skill } from './SkillModal';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/reading-progress.css';

interface ProjectModalProps {
  projectKey: string;
  project: Project;
  skillsData: Record<string, Skill>;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

function buildStory(project: Project) {
  const steps: { label: string; text: string }[] = [];
  if (project.description?.trim()) {
    steps.push({ label: 'Snapshot', text: project.description.trim() });
  }
  const detail = project.description_detail?.trim();
  if (detail && detail !== project.description?.trim()) {
    // Prefer a shorter "story" slice for the approach step
    const approach =
      detail.length > 420 ? `${detail.slice(0, 417).trimEnd()}…` : detail;
    steps.push({ label: 'Story', text: approach });
  }
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
  useEscapeKey(onClose);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    trackModalView(projectKey, 'project', project.title);
  }, [projectKey, project.title]);

  const story = buildStory(project);
  const detail =
    project.description_detail?.trim() || project.description;

  return (
    <div
      className="skill-modal-overlay"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="skill-modal-content project-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
      >
        <button className="modal-close-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="modal-header">
          <h5>{project.title}</h5>
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

          {project.tech_stack && project.tech_stack.length > 0 && (
            <div className="skill-tags">
              {project.tech_stack.map((tag, index) => {
                const skillKey = findSkillKey(skillsData, tag);
                return skillKey ? (
                  <span
                    key={index}
                    className="skill-tag"
                    style={{ cursor: 'pointer' }}
                    {...buttonize(() => onSelectSkill(skillKey))}
                  >
                    {tag.replace(/-/g, ' ')}
                  </span>
                ) : (
                  <span key={index} className="skill-tag">
                    {tag.replace(/-/g, ' ')}
                  </span>
                );
              })}
            </div>
          )}

          <div className="project-modal-actions">
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-website-btn"
            >
              View project
            </a>
            {project.link2 && (
              <a
                href={project.link2}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-website-btn project-modal-secondary"
              >
                Live demo
              </a>
            )}
            <CopyLinkButton
              url={`${window.location.origin}${window.location.pathname}?project=${encodeURIComponent(projectKey)}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
