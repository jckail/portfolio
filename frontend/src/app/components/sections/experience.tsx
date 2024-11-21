import React, { useState, lazy, Suspense, memo } from 'react';
import { useData } from '../../providers/data-provider';
import CompanyLogo from '../../../shared/components/company-logo/CompanyLogo';
import '../../../styles/components/sections/experience.css';
import type { ExperienceItem } from './modals/ExperienceModal';

const ExperienceModal = lazy(() => import('./modals/ExperienceModal'));

// Prefetch function for the modal
const prefetchModal = () => {
  const modalPromise = import('./modals/ExperienceModal');
  return modalPromise;
};

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const ExperienceTimeline = memo(({ 
  experience, 
  onSelectExperience 
}: { 
  experience: Record<string, ExperienceItem>;
  onSelectExperience: (key: string) => void;
}) => {
  return (
    <div className="timeline">
      {Object.entries(experience).map(([key, item]) => (
        <div key={key} className="timeline-item">
          <div className="timeline-header-wrapper">
            {item.logoPath && (
              <div 
                className="logo-link"
                onClick={() => onSelectExperience(key)}
                onMouseEnter={prefetchModal}
                style={{ cursor: 'pointer' }}
              >

                        <CompanyLogo 
          name={item.logoPath || "github-logo.svg"}
          size={64}
          aria-label={`${item.company} logo`}
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
  );
});

const Experience: React.FC = () => {
  const { experienceData, isLoading, error } = useData();
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  if (error) return <div>Error: {error}</div>;

  if (isLoading || !experienceData) {
    return (
      <section id="experience" className="section-container">
        <div className="section-content">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  return (
    <section id="experience" className="section-container">
      <div className="section-header">
        <h2>Experience</h2>
      </div>
      <div className="section-content">
        <ExperienceTimeline 
          experience={experienceData}
          onSelectExperience={setSelectedExperience}
        />
      </div>

      {selectedExperience && experienceData[selectedExperience] && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExperienceModal
            experience={experienceData[selectedExperience]}
            onClose={() => setSelectedExperience(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default Experience;
