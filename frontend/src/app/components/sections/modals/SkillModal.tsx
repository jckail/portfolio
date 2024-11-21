import React, { useEffect } from 'react';
import SkillIcon from '../../../../shared/components/skill-icon/SkillIcon';
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
  onClose: () => void;
}

const SkillModal: React.FC<SkillModalProps> = ({ skill, onClose }) => {
  useEffect(() => {
    // Save current URL to restore it when modal closes
    const currentUrl = window.location.pathname;
    
    // Update URL to include the skill name (URL friendly)
    const skillUrl = `/skills/${skill.display_name.toLowerCase().replace(/\s+/g, '-')}`;
    window.history.pushState({ skillModal: true }, '', skillUrl);

    // Restore original URL when modal closes
    return () => {
      window.history.pushState({ skillModal: false }, '', currentUrl);
    };
  }, [skill.display_name]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state?.skillModal) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
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
          <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="visit-website-btn">
            Click to learn More about {skill.display_name}
          </a>
        </div>
      </div>
    </div>
  );
};

export default SkillModal;
