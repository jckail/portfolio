import React, { memo, lazy, Suspense } from 'react';

import { useData } from '../../providers/data-provider';
import { scrollToSection } from '../../../shared/utils/scroll-utils';
import { buttonize } from '../../../shared/utils/a11y';
import { findSkillKey } from '../../../shared/utils/skills';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import '../../../styles/components/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';
import { useContact } from './about/hooks/useContact';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

import type { AboutMe, Contact } from '../../../types/resume';
import type { Skill } from './modals/SkillModal';

const ContactModal = lazy(() => import('./modals/ContactModal'));
const SkillModal = lazy(() => import('./modals/SkillModal'));

const TLDRContent = memo(({
  aboutMeData,
  contactData,
  skillsData,
  onResumeClick,
  onContactSelect,
  onSkillSelect,
}: {
  aboutMeData: AboutMe;
  contactData: Contact;
  skillsData: Record<string, Skill>;
  onResumeClick: () => void;
  onContactSelect: () => void;
  onSkillSelect: (key: string) => void;
}) => {
  const handleAIClick = () => {
    const chatButton = document.querySelector('[aria-label="Chat with AI"]') as HTMLButtonElement;
    if (chatButton) {
      chatButton.click();
    }
  };

  const bioParagraphs = aboutMeData.brief_bio
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className="about-section">
      <h2>{aboutMeData.greeting}</h2>
      <div className="about-content">
        <p>{aboutMeData.description}</p>

        <div className="headshot-container">
          <img
            src={aboutMeData.full_portrait}
            alt="Profile headshot"
            className="headshot"
            loading="eager"
            width="200"
            height="200"
          />
        </div>
      </div>

      {aboutMeData.primary_skills?.length > 0 && (
        <div className="about-skill-icons" aria-label="Primary skills">
          {aboutMeData.primary_skills.map((name, index) => {
            const skillKey = findSkillKey(skillsData, name);
            const skill = skillKey ? skillsData[skillKey] : undefined;
            return (
              <div
                key={name}
                className="about-skill-item"
                style={{ '--item-index': index } as React.CSSProperties}
                title={name}
                {...(skillKey
                  ? buttonize(() => onSkillSelect(skillKey))
                  : {})}
              >
                <div className="about-skill-icon-container">
                  {skill ? (
                    <SkillIcon
                      name={skill.image}
                      className="about-skill-icon"
                      size={40}
                      aria-label={name}
                    />
                  ) : (
                    <span className="about-skill-fallback">{name.slice(0, 2)}</span>
                  )}
                  <span className="about-skill-name">{name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="brief-bio">
        {bioParagraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <ErrorBoundary>
          <SocialLinks
            github={contactData.github}
            linkedin={contactData.linkedin}
            email={contactData.email}
            onResumeClick={onResumeClick}
            onContactSelect={onContactSelect}
          />
        </ErrorBoundary>
        <p>
          Ask my{' '}
          <span className="ai-highlight" style={{ cursor: 'pointer' }} {...buttonize(handleAIClick)}>
            AI Assistant 🤖
          </span>{' '}
          below for more details about me.
        </p>
      </div>

      {aboutMeData.open_to && (
        <div className="about-cta" role="region" aria-label="Availability">
          <div className="about-cta-copy">
            <strong>Open to {aboutMeData.open_to.roles}</strong>
            <span>{aboutMeData.open_to.note}</span>
            <span className="about-cta-location">Based in {aboutMeData.open_to.location}</span>
          </div>
          <button type="button" className="about-cta-button" onClick={onContactSelect}>
            Get in touch
          </button>
        </div>
      )}
    </div>
  );
});
TLDRContent.displayName = 'TLDRContent';

const TLDR: React.FC = () => {
  const { aboutMeData, contactData, skillsData, isLoading, error } = useData();
  const { selectedContact, setSelectedContact } = useContact();
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);

  const handleResumeClick = () => {
    scrollToSection('resume');
  };

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (isLoading || !aboutMeData || !contactData || !skillsData) {
    return (
      <section id="about" className="section-container">
        <div className="section-content">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="section-container">
      <div className="section-content">
        <ErrorBoundary>
          <TLDRContent
            aboutMeData={aboutMeData}
            contactData={contactData}
            skillsData={skillsData}
            onResumeClick={handleResumeClick}
            onContactSelect={() => setSelectedContact(true)}
            onSkillSelect={setSelectedSkill}
          />
        </ErrorBoundary>
      </div>

      {selectedContact && (
        <Suspense fallback={<LoadingSpinner />}>
          <ContactModal
            email={contactData.email}
            phone={contactData.phone}
            location={contactData.location}
            country={contactData.country}
            onClose={() => setSelectedContact(false)}
          />
        </Suspense>
      )}

      {selectedSkill && skillsData[selectedSkill] && (
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

export default TLDR;
