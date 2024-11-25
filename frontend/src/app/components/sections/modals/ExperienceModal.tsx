import React, { useEffect } from 'react';
import CompanyLogo from '../../../../shared/components/company-logo/CompanyLogo';
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
  useEffect(() => {
    // Add modal-open class to body when modal opens
    document.body.classList.add('modal-open');

    // Handle browser back button
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('company')) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      // Remove modal-open class from body when modal closes
      document.body.classList.remove('modal-open');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Function to find skill key by display name
  const findSkillKey = (tagName: string): string | undefined => {
    return Object.entries(skillsData).find(
      ([_, skill]) => skill.display_name.toLowerCase() === tagName.toLowerCase()
    )?.[0];
  };

  return (
    <div className="experience-modal-overlay" onClick={onClose}>
      <div className="experience-modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
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
                const skillKey = findSkillKey(tag.replace(/-/g, ' '));
                return (
                  <span 
                    key={index} 
                    className="skill-tag"
                    onClick={() => skillKey && onSelectSkill(skillKey)}
                    style={{ cursor: skillKey ? 'pointer' : 'default' }}
                  >
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
