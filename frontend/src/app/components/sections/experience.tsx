import React, { useState, lazy, Suspense, memo } from 'react';
import { useData } from '../../providers/data-provider';
import CompanyLogo from '../../../shared/components/company-logo/CompanyLogo';
import '../../../styles/components/sections/experience.css';
import type { ExperienceItem } from './modals/ExperienceModal';
import type { Skill } from './modals/SkillModal';

const ExperienceModal = lazy(() => import('./modals/ExperienceModal'));
const SkillModal = lazy(() => import('./modals/SkillModal'));

// Prefetch functions for the modals
const prefetchExperienceModal = () => {
  const modalPromise = import('./modals/ExperienceModal');
  return modalPromise;
};

const prefetchSkillModal = () => {
  const modalPromise = import('./modals/SkillModal');
  return modalPromise;
};

const LoadingSpinner = () => (
  <div className="section-loading">
    <div className="loading-spinner"></div>
  </div>
);

const ExperienceTimeline = memo(({ 
  experience, 
  skillsData,
  onSelectExperience,
  onSelectSkill 
}: { 
  experience: Record<string, ExperienceItem>;
  skillsData: Record<string, Skill>;
  onSelectExperience: (key: string) => void;
  onSelectSkill: (skillName: string) => void;
}) => {
  // Function to find skill key by display name
  const findSkillKey = (tagName: string): string | undefined => {
    return Object.entries(skillsData).find(
      ([_, skill]) => skill.display_name.toLowerCase() === tagName.toLowerCase()
    )?.[0];
  };

  return (
    <div className="timeline">
      {Object.entries(experience).map(([key, item]) => (
        <div key={key} className="timeline-item">
          <div className="timeline-header-wrapper">
            {item.logoPath && (
              <div 
                className="logo-link"
                onClick={() => onSelectExperience(key)}
                onMouseEnter={prefetchExperienceModal}
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
          <div className="experience-highlights">
            <div className="skill-tags">
              {item.tech_stack.map((tag: string, index: number) => {
                const skillKey = findSkillKey(tag.replace(/-/g, ' '));
                return (
                  <span 
                    key={index} 
                    className="skill-tag"
                    onClick={() => skillKey && onSelectSkill(skillKey)}
                    onMouseEnter={prefetchSkillModal}
                    style={{ cursor: skillKey ? 'pointer' : 'default' }}
                  >
                    {tag.replace(/-/g, ' ')}
                  </span>
                );
              })}
            </div>
            
            {item.highlights && (
              <ul className="highlights">
                {item.highlights.map((highlight, idx) => (
                  <li key={idx}>{highlight}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

const Experience: React.FC = () => {
  const { experienceData, skillsData, isLoading, error } = useData();
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  if (error) return <div>Error: {error}</div>;

  if (isLoading || !experienceData || !skillsData) {
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
          skillsData={skillsData}
          onSelectExperience={setSelectedExperience}
          onSelectSkill={setSelectedSkill}
        />
      </div>

      {selectedExperience && experienceData[selectedExperience] && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExperienceModal
            experience={experienceData[selectedExperience]}
            skillsData={skillsData}
            onClose={() => setSelectedExperience(null)}
            onSelectSkill={setSelectedSkill}
          />
        </Suspense>
      )}

      {selectedSkill && skillsData[selectedSkill] && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default Experience;
