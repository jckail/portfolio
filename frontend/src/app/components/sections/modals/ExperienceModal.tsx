import React from 'react';

import CompanyLogo from '../../../../shared/components/company-logo/CompanyLogo';
import { buttonize } from '../../../../shared/utils/a11y';
import { findSkillKey } from '../../../../shared/utils/skills';
import { useEscapeKey } from '../../../../shared/hooks/use-escape-key';

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
  skillsData: Record<string, Skill>;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({ 
  experience, 
  skillsData,
  onClose,
  onSelectSkill 
}) => {
  // URL sync (?company= and back-button behavior) is owned by useExperience.
  useEscapeKey(onClose);

  return (
    <div
      className="experience-modal-overlay"
      role="presentation"
      onClick={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="experience-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={`${experience.company} experience details`}
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
            <h3>{experience.company}</h3>
            <h4>{experience.title}</h4>
            <div className="timeline-meta">
              <span className="date">{experience.date}</span>
              <span className="location">{experience.location}</span>
            </div>
          </div>
        </div>
        
        <div className="modal-body">
          <h4>Company Description:</h4>
          <p className="company-description">{experience.company_description}</p>
          <div className="highlights-section">
            <h4>Tech Stack:</h4>
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
                    {tag.replace(/-/g, ' ')}
                  </span>
                ) : (
                  <span key={index} className="skill-tag">
                    {tag.replace(/-/g, ' ')}
                  </span>
                );
              })}
            </div>
            <h4>Detailed Highlights:</h4>
            <ul className="highlights">
              {experience.more_highlights.map((highlight: string, index: number) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ExperienceModal;
