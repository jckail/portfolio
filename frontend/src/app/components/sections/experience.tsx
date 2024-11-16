import React, { useState, useEffect } from 'react';
import { useLoading } from '../../../shared/context/loading-context';
import '../../../styles/features/sections/experience.css';

interface ExperienceItem {
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

interface ExperienceData {
  [key: string]: ExperienceItem;
}

interface ExperienceModalProps {
  experience: ExperienceItem;
  onClose: () => void;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({ experience, onClose }) => (
  <div className="experience-modal-overlay" onClick={onClose}>
    <div className="experience-modal-content" onClick={e => e.stopPropagation()}>
      <button className="modal-close-button" onClick={onClose}>&times;</button>
      <div className="timeline-header-wrapper">
        {experience.logoPath && (
          <a 
            href={experience.link}
            target="_blank" 
            rel="noopener noreferrer"
            className="logo-link"
          >
            <img 
              src={experience.logoPath} 
              alt={`${experience.company} logo`} 
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
            {experience.tech_stack.map((tag, index) => (
              <span key={index} className="skill-tag">
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
          <h4>Detailed Highlights:</h4>
          <ul className="highlights">
            {experience.more_highlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const Experience: React.FC = () => {
  const [experience, setExperience] = useState<ExperienceData>({});
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setComponentLoading } = useLoading();

  useEffect(() => {
    let mounted = true;

    const fetchExperience = async () => {
      try {
        setComponentLoading('experience', true);
        const response = await fetch('/api/experience');
        if (!response.ok) {
          throw new Error('Failed to fetch experience data');
        }
        const data = await response.json();
        if (mounted) {
          setExperience(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setComponentLoading('experience', false);
        }
      }
    };

    fetchExperience();

    return () => {
      mounted = false;
    };
  }, [setComponentLoading]);

  if (error) return <div>Error: {error}</div>;

  return (
    <section id="experience" className="section-container">
      <div className="section-header">
        <h2>Experience</h2>
      </div>
      <div className="section-content">
        <div className="timeline">
          {Object.entries(experience).map(([key, item]) => (
            <div key={key} className="timeline-item">
              <div className="timeline-header-wrapper">
                {item.logoPath && (
                  <div 
                    className="logo-link"
                    onClick={() => setSelectedExperience(key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={item.logoPath} 
                      alt={`${item.company} logo`} 
                      className="company-logo"
                    />
                  </div>
                )}
                <div className="timeline-header">
                  <h3>{item.company}</h3>
                  <h4>{item.title}</h4>
                  <div className="timeline-meta">
                    <span className="date">{item.date}</span>
                    <span className="location">{item.location}</span>
                  </div>
                </div>
              </div>
              {item.highlights && (
                <ul className="highlights">
                  {item.highlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedExperience && experience[selectedExperience] && (
        <ExperienceModal
          experience={experience[selectedExperience]}
          onClose={() => setSelectedExperience(null)}
        />
      )}
    </section>
  );
};

export default Experience;
