import React, { memo, lazy, Suspense } from 'react';

import { useData } from '../../providers/data-provider';
import { scrollToSection } from '../../../shared/utils/scroll-utils';
import { buttonize } from '../../../shared/utils/a11y';
import { useChatAvailable } from '../../../shared/hooks/use-chat-available';
import { findSkillKey } from '../../../shared/utils/skills';
import { buildHeadshotSrcSet } from '../../../shared/utils/responsive-image';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import '../../../styles/components/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';
import { useContact } from './about/hooks/useContact';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';

import type { AboutMe, Contact } from '../../../types/resume';
import type { Skill } from './modals/SkillModal';
import type { ExperienceItem } from './modals/ExperienceModal';

const ContactModal = lazy(() => import('./modals/ContactModal'));
const SkillModal = lazy(() => import('./modals/SkillModal'));

export interface CurrentRole {
  title: string;
  company?: string;
}

/**
 * The role to headline in the hero: the experience entry whose date runs to
 * "Present", falling back to the contact title when no entry is current.
 */
export function findCurrentRole(
  experienceData: Record<string, ExperienceItem> | null | undefined,
  fallbackTitle?: string
): CurrentRole | null {
  const current = Object.values(experienceData ?? {}).find(item =>
    /\bpresent\b/i.test(item?.date ?? '')
  );
  if (current?.title) {
    return { title: current.title, company: current.company };
  }
  return fallbackTitle ? { title: fallbackTitle } : null;
}

const isApplePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/** Opens the command palette by replaying the shortcut its host listens for. */
const openCommandPalette = () => {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: isApplePlatform(), bubbles: true })
  );
};

const TLDRContent = memo(({
  aboutMeData,
  contactData,
  currentRole,
  skillsData,
  onResumeClick,
  onContactSelect,
  onSkillSelect,
}: {
  aboutMeData: AboutMe;
  contactData: Contact;
  currentRole: CurrentRole | null;
  skillsData: Record<string, Skill>;
  onResumeClick: () => void;
  onContactSelect: () => void;
  onSkillSelect: (key: string) => void;
}) => {
  // Hidden when the assistant is unavailable: the launcher it clicks is gone.
  const chatAvailable = useChatAvailable();
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

  const fullName = [contactData.firstName, contactData.lastName].filter(Boolean).join(' ');
  const shortcutModifier = isApplePlatform() ? '⌘' : 'Ctrl';

  return (
    <div className="about-section">
      <div className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">{aboutMeData.greeting}</p>
          <h2 className="about-name">{fullName || aboutMeData.greeting}</h2>
          {currentRole && (
            <p className="about-role">
              {currentRole.title}
              {currentRole.company && (
                <>
                  {' '}<span className="about-role-at">at</span>{' '}
                  <span className="about-role-company">{currentRole.company}</span>
                </>
              )}
            </p>
          )}
          <p className="about-description">{aboutMeData.description}</p>
        </div>

        <div className="headshot-container">
          <img
            src={aboutMeData.full_portrait}
            srcSet={buildHeadshotSrcSet(aboutMeData.full_portrait)}
            alt="Profile headshot"
            className="headshot"
            loading="eager"
            width="200"
            height="200"
          />
        </div>
      </div>

      <div className="about-actions">
        <ErrorBoundary>
          <SocialLinks
            github={contactData.github}
            linkedin={contactData.linkedin}
            email={contactData.email}
            onResumeClick={onResumeClick}
            onContactSelect={onContactSelect}
          />
        </ErrorBoundary>
        <button
          type="button"
          className="about-shortcut-hint"
          onClick={openCommandPalette}
          title={`Quick navigation (${shortcutModifier}+K)`}
          aria-keyshortcuts={isApplePlatform() ? 'Meta+K' : 'Control+K'}
        >
          <kbd>{shortcutModifier}</kbd>
          <kbd>K</kbd>
          <span className="about-shortcut-label">Quick nav</span>
        </button>
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
        {chatAvailable && (
          <p>
            Ask my{' '}
            <span className="ai-highlight" style={{ cursor: 'pointer' }} {...buttonize(handleAIClick)}>
              AI Assistant 🤖
            </span>{' '}
            below for more details about me.
          </p>
        )}
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
  const { aboutMeData, contactData, experienceData, skillsData, isLoading, error } = useData();
  const { selectedContact, setSelectedContact } = useContact();
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);

  const handleResumeClick = () => {
    scrollToSection('resume');
  };

  if (error) return <div className="error-aboutme">Error: {error}</div>;

  if (isLoading || !aboutMeData || !contactData || !skillsData) {
    // Sized like the rendered hero so its arrival doesn't push the page down.
    return (
      <section id="about" className="section-container" aria-busy="true">
        <div className="section-content">
          <div className="about-section about-skeleton">
            <LoadingSpinner />
          </div>
        </div>
      </section>
    );
  }

  const currentRole = findCurrentRole(experienceData, contactData.title);

  return (
    <section id="about" className="section-container">
      <div className="section-content">
        <ErrorBoundary>
          <TLDRContent
            aboutMeData={aboutMeData}
            contactData={contactData}
            currentRole={currentRole}
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
