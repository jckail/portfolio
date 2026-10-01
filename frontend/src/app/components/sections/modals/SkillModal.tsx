import React, { useEffect, useId } from 'react';

import SkillIcon from '../../../../shared/components/skill-icon/SkillIcon';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackModalView } from '../../../../shared/utils/analytics';
import { formatTag } from '../../../../shared/utils/skills';
import { shareUrl } from '../../../../shared/utils/url-params';

import type { Skill } from '../../../../types/skills';
import '../../../../styles/components/modal.css';

interface SkillModalProps {
  skill: Skill;
  /** Data key used for the shareable ?skill= deep link. */
  skillKey?: string;
  onClose: () => void;
}

// URL sync (the ?skill= param and back-button behavior) belongs to whichever
// section owns the selection (useSkill in Skills, local state elsewhere). This
// modal used to push its own display-name slug, which broke shared links.
const SkillModal: React.FC<SkillModalProps> = ({ skill, skillKey, onClose }) => {
  const titleId = useId();

  useEffect(() => {
    trackModalView(skillKey || skill.display_name, 'skill', skill.display_name);
  }, [skillKey, skill.display_name]);

  const examples = Object.entries(skill.examples);

  return (
    <DialogShell
      overlayClassName="skill-modal-overlay"
      className="skill-modal-content"
      labelledBy={titleId}
      onClose={onClose}
      closeButton
    >
      <div className="modal-header">
        <h2 id={titleId}>{skill.display_name}</h2>
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
          {skill.professional_experience && ' (Professional)'}
        </p>
        <p className="skill-description">{skill.description}</p>
        <div className="skill-tags">
          {skill.tags.map((tag, index) => (
            <span key={index} className="skill-tag">
              {formatTag(tag)}
            </span>
          ))}
        </div>
        {examples.length > 0 && (
          <div className="examples-section">
            <h3>Examples:</h3>
            <ul>
              {examples.map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="project-modal-actions">
          <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
            Learn more about {skill.display_name}
          </a>
          {skillKey && <CopyLinkButton url={shareUrl('skill', skillKey)} />}
        </div>
      </div>
    </DialogShell>
  );
};

export default SkillModal;
