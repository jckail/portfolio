import React, { lazy, Suspense, memo } from 'react';

import { useData } from '../../providers/data-provider';
import CompanyLogo from '../../../shared/components/company-logo/CompanyLogo';
import { buttonize } from '../../../shared/utils/a11y';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { findSkillKey } from '../../../shared/utils/skills';
import '../../../styles/components/sections/experience.css';
import { useExperience } from './experience/hooks/useExperience';

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
  return (
    <div className="timeline">
      {Object.entries(experience).map(([key, item]) => (
        <div key={key} className="timeline-item">
          <div className="timeline-header-wrapper">
            {item.logoPath && (
              <div
                className="logo-link"
                aria-label={`View ${item.company} experience details`}
                onMouseEnter={prefetchExperienceModal}
                style={{ cursor: 'pointer' }}
                {...buttonize(() => onSelectExperience(key))}
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
                const skillKey = findSkillKey(skillsData, tag);
                return skillKey ? (
                  <span
                    key={index}
                    className="skill-tag"
                    onMouseEnter={prefetchSkillModal}
                    style={{ cursor: 'pointer' }}
                    {...buttonize(() => onSelectSkill(skillKey))}
                  >
                    {tag.replace(/-/g, ' ')}
                  </span>
                ) : (
                  <span key={index} className="skill-tag">
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
ExperienceTimeline.displayName = 'ExperienceTimeline';


const Experience: React.FC = () => {
  const { experienceData, skillsData, isLoading, error } = useData();
  const { selectedExperience, setSelectedExperience } = useExperience();
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);

  // Map company slugs to experience keys
  const companyKeyMap: { [key: string]: string } = {
    'prove-identity': 'prove',
    'meta-facebook': 'meta',
    'deloitte': 'deloitte',
    'wide-open-west': 'wide_open_west',
    'common-spirit-health': 'common_spirit_health',
    'acustream-r1': 'acustream'
  };

  // Map experience keys to company slugs
  const keyCompanyMap: { [key: string]: string } = {
    'prove': 'prove-identity',
    'meta': 'meta-facebook',
    'deloitte': 'deloitte',
    'wide_open_west': 'wide-open-west',
    'common_spirit_health': 'common-spirit-health',
    'acustream': 'acustream-r1'
  };

  const handleSelectExperience = (key: string) => {
    // useExperience mirrors this state into the ?company= URL parameter
    setSelectedExperience(keyCompanyMap[key] || key);
  };

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
          onSelectExperience={handleSelectExperience}
          onSelectSkill={setSelectedSkill}
        />
      </div>

      {selectedExperience && experienceData[companyKeyMap[selectedExperience] || selectedExperience] && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExperienceModal
            experience={experienceData[companyKeyMap[selectedExperience] || selectedExperience]}
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
