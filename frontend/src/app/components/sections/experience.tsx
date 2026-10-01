import React, { Suspense, lazy, memo, useCallback, useState } from 'react';

import { useData } from '../../providers/data-provider';
import CompanyLogo from '../../../shared/components/company-logo/CompanyLogo';
import { buttonize } from '../../../shared/utils/a11y';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { getOwn } from '../../../shared/utils/lookup';
import '../../../styles/components/sections/experience.css';
import { useExperience } from './experience/hooks/useExperience';
import { SkillModalHost, prefetchSkillModal } from './modals/SkillModalHost';
import { SectionPlaceholder } from './section-placeholder';
import { TechStackTags } from './tech-stack-tags';

import type { ExperienceData } from '../../../types/resume';
import type { SkillsData } from '../../../types/skills';

const ExperienceModal = lazy(() => import('./modals/ExperienceModal'));

const prefetchExperienceModal = () => import('./modals/ExperienceModal');

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
  experienceData: ExperienceData,
  slug: string
): string | undefined {
  const key = SLUG_TO_KEY.get(slug) ?? slug;
  return Object.hasOwn(experienceData, key) ? key : undefined;
}

const ExperienceTimeline = memo(({
  experience,
  skillsData,
  onSelectExperience,
  onSelectSkill,
}: {
  experience: ExperienceData;
  skillsData: SkillsData;
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
                  name={item.logoPath}
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
            <TechStackTags
              tags={item.tech_stack}
              skillsData={skillsData}
              onSelectSkill={onSelectSkill}
              onSkillHover={prefetchSkillModal}
            />

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
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Stable callbacks keep the memoised timeline from re-rendering whenever a
  // modal opens or closes.
  const handleSelectExperience = useCallback(
    // useExperience mirrors this state into the ?company= URL parameter
    (key: string) => setSelectedExperience(KEY_TO_SLUG.get(key) ?? key),
    [setSelectedExperience]
  );
  const closeExperience = useCallback(() => setSelectedExperience(null), [setSelectedExperience]);
  const closeSkill = useCallback(() => setSelectedSkill(null), []);

  if (error) return <div>Error: {error}</div>;

  if (isLoading || !experienceData || !skillsData) {
    return <SectionPlaceholder id="experience" />;
  }

  const experienceKey = selectedExperience
    ? resolveExperienceKey(experienceData, selectedExperience)
    : undefined;
  const selected = getOwn(experienceData, experienceKey);

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

      {selected && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExperienceModal
            experience={selected}
            experienceKey={selectedExperience ?? undefined}
            skillsData={skillsData}
            onClose={closeExperience}
            onSelectSkill={setSelectedSkill}
          />
        </Suspense>
      )}

      <SkillModalHost skillsData={skillsData} skillKey={selectedSkill} onClose={closeSkill} />
    </section>
  );
};

export default Experience;
