import React from 'react';

import ProjectIcon from '../../../../shared/components/project-icon/ProjectIcon';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { buttonize } from '../../../../shared/utils/a11y';
import { findSkillKey } from '../../../../shared/utils/skills';
import { useEscapeKey } from '../../../../shared/hooks/use-escape-key';

import type { Project } from '../../../../types/resume';
import type { Skill } from './SkillModal';
import '../../../../styles/components/modal.css';

interface ProjectModalProps {
  projectKey: string;
  project: Project;
  skillsData: Record<string, Skill>;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  projectKey,
  project,
  skillsData,
  onClose,
  onSelectSkill,
}) => {
  useEscapeKey(onClose);

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
          {project.last_commit && (
            <p className="experience-info">
              Last updated <strong>{project.last_commit}</strong>
            </p>
          )}
          <p className="skill-description">{detail}</p>

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
