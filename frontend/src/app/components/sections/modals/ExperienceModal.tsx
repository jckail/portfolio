import React, { useEffect, useId } from 'react';

import CompanyLogo from '../../../../shared/components/company-logo/CompanyLogo';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackModalView } from '../../../../shared/utils/analytics';
import { shareUrl } from '../../../../shared/utils/url-params';
import { TechStackTags } from '../tech-stack-tags';

import type { ExperienceItem } from '../../../../types/resume';
import type { SkillsData } from '../../../../types/skills';
import '../../../../styles/components/modal.css';

interface ExperienceModalProps {
  experience: ExperienceItem;
  /** Data key used for the shareable ?company= deep link. */
  experienceKey?: string;
  skillsData: SkillsData;
  onClose: () => void;
  onSelectSkill: (skillKey: string) => void;
}

// URL sync (?company= and back-button behavior) is owned by useExperience.
const ExperienceModal: React.FC<ExperienceModalProps> = ({
  experience,
  experienceKey,
  skillsData,
  onClose,
  onSelectSkill,
}) => {
  const titleId = useId();

  useEffect(() => {
    trackModalView(experienceKey || experience.company, 'experience', experience.company);
  }, [experienceKey, experience.company]);

  return (
    <DialogShell
      overlayClassName="experience-modal-overlay"
      className="experience-modal-content"
      labelledBy={titleId}
      onClose={onClose}
      closeButton
    >
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
              name={experience.logoPath}
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
          <TechStackTags
            tags={experience.tech_stack}
            skillsData={skillsData}
            onSelectSkill={onSelectSkill}
          />
          <h3>Detailed Highlights:</h3>
          <ul className="highlights">
            {experience.more_highlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
        {experienceKey && (
          <div className="project-modal-actions">
            <CopyLinkButton url={shareUrl('company', experienceKey)} />
          </div>
        )}
      </div>
    </DialogShell>
  );
};

export default ExperienceModal;
