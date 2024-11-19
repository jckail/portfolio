import React from 'react';
import SkillIcon from '../../../../shared/components/skill-icon/SkillIcon';

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
  onClose: () => void;
}

const SkillModal: React.FC<SkillModalProps> = ({ skill, onClose }) => {
  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
            <div className="icon-wrapper">
              <SkillIcon
                name={skill.image}
                className="skill-icon"
                size={32}
                aria-label={skill.display_name}
              />
            </div>
          </div>
          <h3>{skill.display_name}</h3>
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
          <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
            Visit Website
          </a>
        </div>
      </div>
    </div>
  );
};

export default SkillModal;
