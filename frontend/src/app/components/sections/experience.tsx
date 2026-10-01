import React, { lazy, Suspense, memo } from 'react';

import { useData } from '../../providers/data-provider';
import CompanyLogo from '../../../shared/components/company-logo/CompanyLogo';
import { buttonize } from '../../../shared/utils/a11y';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { findSkillKey, formatTag } from '../../../shared/utils/skills';
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

// Company slug (the shareable ?company= value) <-> experience data key.
// Maps, not object literals: the slug comes from the URL, and a plain object
// would answer `constructor`/`__proto__` from Object.prototype.
const SLUG_TO_KEY = new Map<string, string>([
  ['together-ai', 'together_ai'],
  ['prove-identity', 'prove'],
  ['meta-facebook', 'meta'],
  ['deloitte', 'deloitte'],
  ['wide-open-west', 'wide_open_west'],
  ['common-spirit-health', 'common_spirit_health'],
  ['acustream-r1', 'acustream'],
]);
const KEY_TO_SLUG = new Map(Array.from(SLUG_TO_KEY, ([slug, key]) => [key, slug]));

/** Resolve a ?company= value to an own key of the experience data, if any. */
export function resolveExperienceKey(
  experienceData: Record<string, ExperienceItem>,
  slug: string
): string | undefined {
  const key = SLUG_TO_KEY.get(slug) ?? slug;
  return Object.hasOwn(experienceData, key) ? key : undefined;
}

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
                onMouseEnter={prefetchExperienceModal}
                style={{ cursor: 'pointer' }}
                {...buttonize(() => onSelectExperience(key))}
              >
                {/* The logo's own text (e.g. "together.ai") is decorative; the
                    name comes from the hidden text so it never contradicts what
                    is drawn (Lighthouse label-content-name-mismatch). */}
                <CompanyLogo
                  name={item.logoPath || "github-logo.svg"}
                  size={64}
                  aria-hidden
                  className="company-logo"
                />
                <span className="sr-only">{`View ${item.company} experience details`}</span>
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
                    {formatTag(tag, skillsData, skillKey)}
                  </span>
                ) : (
                  <span key={index} className="skill-tag">
                    {formatTag(tag, skillsData, skillKey)}
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

  const handleSelectExperience = (key: string) => {
    // useExperience mirrors this state into the ?company= URL parameter
    setSelectedExperience(KEY_TO_SLUG.get(key) ?? key);
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

  const experienceKey = selectedExperience
    ? resolveExperienceKey(experienceData, selectedExperience)
    : undefined;

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

      {experienceKey && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExperienceModal
            experience={experienceData[experienceKey]}
            experienceKey={selectedExperience ?? undefined}
            skillsData={skillsData}
            onClose={() => setSelectedExperience(null)}
            onSelectSkill={setSelectedSkill}
          />
        </Suspense>
      )}

      {selectedSkill && Object.hasOwn(skillsData, selectedSkill) && (
        <Suspense fallback={<LoadingSpinner />}>
          <SkillModal
            skill={skillsData[selectedSkill]}
            skillKey={selectedSkill}
            onClose={() => setSelectedSkill(null)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default Experience;
