import React from 'react';

import SkillIcon from '../../../../shared/components/skill-icon/SkillIcon';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { useEscapeKey } from '../../../../shared/hooks/use-escape-key';
import { useFocusTrap } from '../../../../shared/hooks/use-focus-trap';
import '../../../../styles/components/modal.css';

export interface Skill {
  display_name: string;
  description: string;
  years_of_experience: number;
  professional_experience: boolean;
  image: string;
  tags: string[];
  examples: Record<string, string>;
  weblink: string;
  general_category: string;
}

interface SkillModalProps {
  skill: Skill;
  /** Data key used for the shareable ?skill= deep link. */
  skillKey?: string;
  onClose: () => void;
}

// URL sync (the ?skill= param and back-button behavior) is owned entirely by
// the useSkill hook. Previously this modal also pushed its own URL using a
// display-name slug, which conflicted with useSkill's data key and broke
// shared/bookmarked skill links.
const SkillModal: React.FC<SkillModalProps> = ({ skill, skillKey, onClose }) => {
  useEscapeKey(onClose);
  const trapRef = useFocusTrap(true);

  const shareUrl = skillKey
    ? `${window.location.origin}${window.location.pathname}?skill=${encodeURIComponent(skillKey)}`
    : undefined;

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
        className="skill-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={skill.display_name}
      >
        <button className="modal-close-button" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-header">
          <h5>{skill.display_name}</h5>
          <div className="modal-icon-wrapper">
            <div className="icon-wrapper">
              <SkillIcon
                name={skill.image}
                className="modal-skill-icon"
                size={32}
                aria-label={skill.display_name}
              />
            </div>
          </div>
        </div>
        <div className="modal-body">
          <p className="experience-info">
            <strong>{skill.years_of_experience} years</strong> of experience
            {skill.professional_experience && " (Professional)"}
          </p>
          <p className="skill-description">{skill.description}</p>
          <div className="skill-tags">
            {skill.tags.map((tag: string, index: number) => (
              <span key={index} className="skill-tag">
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
          {Object.keys(skill.examples).length > 0 && (
            <div className="examples-section">
              <h4>Examples:</h4>
              <ul>
                {Object.entries(skill.examples).map(([key, value]: [string, string]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="project-modal-actions">
            <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
              Learn more about {skill.display_name}
            </a>
            {shareUrl && <CopyLinkButton url={shareUrl} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillModal;
