import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

import CompanyLogo from '../../../../shared/components/company-logo/CompanyLogo';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { buttonize } from '../../../../shared/utils/a11y';
import { findSkillKey, formatTag } from '../../../../shared/utils/skills';
import { trackModalView } from '../../../../shared/utils/analytics';
import { useFocusTrap } from '../../../../shared/hooks/use-focus-trap';

import type { Skill } from './SkillModal';
import '../../../../styles/components/modal.css';

export interface ExperienceItem {
  company: string;
  title: string;
  date: string;
  location: string;
  highlights: string[];
  link: string;
  logoPath: string;
  company_description: string;
  tech_stack: string[];
  more_highlights: string[];
}

interface ExperienceModalProps {
  experience: ExperienceItem;
  /** Data key used for the shareable ?company= deep link. */
  experienceKey?: string;
  skillsData: Record<string, Skill>;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({ 
  experience,
  experienceKey,
  skillsData,
  onClose,
  onSelectSkill 
}) => {
  // URL sync (?company= and back-button behavior) is owned by useExperience.
  const trapRef = useFocusTrap(true, onClose);
  const titleId = useId();

  useEffect(() => {
    trackModalView(experienceKey || experience.company, 'experience', experience.company);
  }, [experienceKey, experience.company]);

  const shareUrl = experienceKey
    ? `${window.location.origin}${window.location.pathname}?company=${encodeURIComponent(experienceKey)}`
    : undefined;

  // Portaled to <body> so it stacks above the cookie banner and chat button,
  // which are also body-level; inside #root no z-index could get it there.
  return createPortal(
    <div
      className="experience-modal-overlay"
      role="presentation"
      onClick={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="experience-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button className="modal-close-button" onClick={onClose} aria-label="Close">&times;</button>
        <div className="experience-modal-wrapper"></div>
        <div className="experience-modal-timeline-header-wrapper">
          {experience.logoPath && (
            <a 
              href={experience.link}
              target="_blank" 
              rel="noopener noreferrer"
              className="experience-modal-logo-link"
            >
              <CompanyLogo 
                name={experience.logoPath || "github-logo.svg"}
                size={64}
                aria-label={`${experience.company} logo`}
                className="experience-modal-company-logo"
              />
            </a>
          )}
          <div className="experience-modal-timeline-header">
            <h2 id={titleId}>{experience.company}</h2>
            <p className="experience-modal-role">{experience.title}</p>
            <div className="timeline-meta">
              <span className="date">{experience.date}</span>
              <span className="location">{experience.location}</span>
            </div>
          </div>
        </div>
        
        <div className="modal-body">
          <h3>Company Description:</h3>
          <p className="company-description">{experience.company_description}</p>
          <div className="highlights-section">
            <h3>Tech Stack:</h3>
            <div className="skill-tags">
              {experience.tech_stack.map((tag: string, index: number) => {
                const skillKey = findSkillKey(skillsData, tag);
                return skillKey ? (
                  <span
                    key={index}
                    className="skill-tag"
                    style={{ cursor: 'pointer' }}
                    {...buttonize(() => onSelectSkill(skillKey))}
                  >
                    {formatTag(tag, skillsData, skillKey)}
                  </span>
                ) : (
                  <span key={index} className="skill-tag">
                    {formatTag(tag, skillsData, skillKey)}
                  </span>
                );
              })}
            </div>
            <h3>Detailed Highlights:</h3>
            <ul className="highlights">
              {experience.more_highlights.map((highlight: string, index: number) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
          {shareUrl && (
            <div className="project-modal-actions">
              <CopyLinkButton url={shareUrl} />
            </div>
          )}
        </div>
        
      </div>
    </div>,
    document.body
  );
};

export default ExperienceModal;
