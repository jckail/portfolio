import React, { useEffect, useId } from 'react';

import CompanyLogo, { isMarkOnlyLogo } from '../../../../shared/components/company-logo/CompanyLogo';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackModalView } from '../../../../shared/utils/analytics';
import { shareUrl } from '../../../../shared/utils/url-params';
import { ExperienceMark } from '../experience/ExperienceMark';
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
  const techStack = experience.tech_stack ?? [];
  const photos = experience.photos ?? [];

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
        {experience.logoPath && experience.link ? (
          <a
            href={experience.link}
            target="_blank"
            rel="noopener noreferrer"
            className="experience-modal-logo-link"
            aria-label={`${experience.company} website`}
          >
            <CompanyLogo
              name={experience.logoPath}
              size={64}
              aria-hidden
              className={`experience-modal-company-logo${isMarkOnlyLogo(experience.logoPath) ? ' experience-modal-company-logo--mark' : ''}`}
            />
          </a>
        ) : experience.logoPath ? (
          <CompanyLogo
            name={experience.logoPath}
            size={64}
            aria-hidden
            className={`experience-modal-company-logo${isMarkOnlyLogo(experience.logoPath) ? ' experience-modal-company-logo--mark' : ''}`}
          />
        ) : (
          <span className="experience-modal-logo-link">
            <ExperienceMark className="experience-modal-company-logo experience-modal-company-logo--mark experience-modal-mark" />
          </span>
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
        <h3>{experience.link ? 'Company Description:' : 'About:'}</h3>
        <p className="company-description">{experience.company_description}</p>
        <div className="highlights-section">
          {techStack.length > 0 && (
            <>
              <h3>Tech Stack:</h3>
              <TechStackTags tags={techStack} skillsData={skillsData} onSelectSkill={onSelectSkill} />
            </>
          )}
          <h3>{techStack.length > 0 ? 'Detailed Highlights:' : 'Highlights:'}</h3>
          <ul className="highlights">
            {experience.more_highlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
        {photos.length > 0 && (
          <section className="experience-photos" aria-label={`${experience.company} photos`}>
            <h3>Photos:</h3>
            <ul className="experience-photos-grid">
              {photos.map(photo => (
                <li key={photo.src}>
                  <figure>
                    <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                    {photo.caption && <figcaption>{photo.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}
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
