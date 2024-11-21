import React from 'react';
import CompanyLogo from '../../../../shared/components/company-logo/CompanyLogo';


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
  onClose: () => void;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({ experience, onClose }) => (
  <div className="experience-modal-overlay" onClick={onClose}>
    <div className="experience-modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <button className="modal-close-button" onClick={onClose}>&times;</button>
      <div className="timeline-header-wrapper">
        {experience.logoPath && (
          <a 
            href={experience.link}
            target="_blank" 
            rel="noopener noreferrer"
            className="logo-link"
          >
                        <CompanyLogo 
          name={experience.logoPath || "github-logo.svg"}
          size={64}
          aria-label={`${experience.company} logo`}
          className="company-logo"
        />
          </a>
        )}
        <div className="timeline-header">
          <h3>{experience.company}</h3>
          <h4>{experience.title}</h4>
          <div className="timeline-meta">
            <span className="date">{experience.date}</span>
            <span className="location">{experience.location}</span>
          </div>
        </div>
      </div>
      <div className="modal-body">
        <p className="company-description">{experience.company_description}</p>
        <div className="highlights-section">
          <div className="skill-tags">
            {experience.tech_stack.map((tag: string, index: number) => (
              <span key={index} className="skill-tag">
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
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

export default ExperienceModal;
