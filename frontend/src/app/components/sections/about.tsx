import React, { Suspense, lazy, memo, useCallback, useMemo, useState } from 'react';

import { useThemeStore } from '../../../shared/stores/theme-store';
import { openAgent } from '../../../shared/utils/agent-link';
import { useData } from '../../providers/data-provider';
import { scrollToSection } from '../../../shared/utils/scroll-utils';
import { buttonize } from '../../../shared/utils/a11y';
import { useChatAvailable } from '../../../shared/hooks/use-chat-available';
import { findSkillKey } from '../../../shared/utils/skills';
import { getOwn } from '../../../shared/utils/lookup';
import { buildHeadshotSrcSet } from '../../../shared/utils/responsive-image';
import SkillIcon from '../../../shared/components/skill-icon/SkillIcon';
import '../../../styles/components/sections/about.css';
import SocialLinks from './social-links/SocialLinks';
import { ErrorBoundary } from '../../components/error-boundary';
import { useContact } from './about/hooks/useContact';
import { DataError } from '../../../shared/components/data-error';
import { LoadingSpinner } from '../../../shared/components/loading-spinner';
import { SkillModalHost } from './modals/SkillModalHost';

import type { AboutMe, Contact, ExperienceData } from '../../../types/resume';
import type { SkillsData } from '../../../types/skills';

const ContactModal = lazy(() => import('./modals/ContactModal'));
const ConnectAssistantModal = lazy(() => import('./modals/ConnectAssistantModal'));

export interface CurrentRole {
  title: string;
  company?: string;
}

/**
 * The role to headline in the hero: the experience entry whose date runs to
 * "Present", falling back to the contact title when no entry is current.
 */
export function findCurrentRole(
  experienceData: ExperienceData | null | undefined,
  fallbackTitle?: string
): CurrentRole | null {
  const current = Object.values(experienceData ?? {}).find((item) =>
    /\bpresent\b/i.test(item?.date ?? '')
  );
  if (current?.title) {
    return { title: current.title, company: current.company };
  }
  return fallbackTitle ? { title: fallbackTitle } : null;
}

const isApplePlatform = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/** Opens the command palette by replaying the shortcut its host listens for. */
const openCommandPalette = () => {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      metaKey: isApplePlatform(),
      bubbles: true,
    })
  );
};

const TLDRContent = memo(
  ({
    aboutMeData,
    contactData,
    currentRole,
    skillsData,
    onResumeClick,
    onContactSelect,
    onSkillSelect,
    onConnectAssistant,
  }: {
    aboutMeData: AboutMe;
    contactData: Contact;
    currentRole: CurrentRole | null;
    skillsData: SkillsData;
    onResumeClick: () => void;
    onContactSelect: () => void;
    onSkillSelect: (key: string) => void;
    onConnectAssistant: () => void;
  }) => {
    // Hidden when the assistant is unavailable: the launcher it clicks is gone.
    const chatAvailable = useChatAvailable();
    const agentTheme = useThemeStore(state => state.theme);

    const bioParagraphs = useMemo(
      () =>
        aboutMeData.brief_bio
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean),
      [aboutMeData.brief_bio]
    );

    const fullName = [contactData.firstName, contactData.lastName].filter(Boolean).join(' ');
    const shortcutModifier = isApplePlatform() ? '⌘' : 'Ctrl';

    return (
      <div className="about-section panel">
        <div className="about-hero">
          <div className="about-hero-copy">
            <h1 className="about-name">{fullName || aboutMeData.greeting}</h1>
            {currentRole && (
              <p className="about-role">
                {currentRole.title}
                {currentRole.company && (
                  <>
                    {' '}
                    <span className="about-role-at">at</span>{' '}
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
            <button className="btn connect-agent-button" type="button" onClick={onConnectAssistant} aria-haspopup="dialog">
              <span className="connect-agent-brands" aria-hidden="true">
                <span className="connect-agent-logo connect-agent-logo-openai" />
                <span className="connect-agent-logo connect-agent-logo-claude" />
              </span>
              Connect your agent
            </button>
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
        </div>

        <div className="about-details">
          <div className="brief-bio">
            {bioParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {chatAvailable && (
              <p>
                <a className="ai-highlight" href={`/agent?theme=${agentTheme}`} onClick={event => { event.preventDefault(); openAgent(); }}>
                  Chat with my Agent 🤖
                </a>{' '}
                for more details about me.
              </p>
            )}
          </div>

          {aboutMeData.primary_skills?.length > 0 && (
            <div className="about-skill-icons" aria-label="Primary skills">
              {aboutMeData.primary_skills.map((name) => {
                const skillKey = findSkillKey(skillsData, name);
                const skill = getOwn(skillsData, skillKey);
                return (
                  <div
                    key={name}
                    className={`about-skill-item${skillKey ? ' is-interactive' : ''}`}
                    title={name}
                    {...(skillKey ? buttonize(() => onSkillSelect(skillKey)) : {})}
                  >
                    {skill ? (
                      <SkillIcon
                        name={skill.image}
                        className="about-skill-icon"
                        size={28}
                        aria-label={name}
                      />
                    ) : (
                      <span className="about-skill-fallback" aria-hidden="true">
                        {name.slice(0, 2)}
                      </span>
                    )}
                    <span className="about-skill-name">{name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);
TLDRContent.displayName = 'TLDRContent';

const handleResumeClick = () => scrollToSection('resume');

const TLDR: React.FC = () => {
  const { aboutMeData, contactData, experienceData, skillsData, isLoading, error } = useData();
  const { selectedContact, setSelectedContact } = useContact();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [connectingAssistant, setConnectingAssistant] = useState(false);

  // Stable props so the memoised hero does not re-render when a modal opens
  const openContact = useCallback(() => setSelectedContact(true), [setSelectedContact]);
  const closeContact = useCallback(() => setSelectedContact(false), [setSelectedContact]);
  const closeSkill = useCallback(() => setSelectedSkill(null), []);
  const openConnectAssistant = useCallback(() => {
    setSelectedContact(false);
    setSelectedSkill(null);
    setConnectingAssistant(true);
  }, [setSelectedContact]);
  const closeConnectAssistant = useCallback(() => setConnectingAssistant(false), []);
  const useMyAgent = useCallback(() => {
    setConnectingAssistant(false);
    // Let DialogShell restore the opener's focus before the agent pane mounts.
    window.setTimeout(openAgent, 0);
  }, []);
  const currentRole = useMemo(
    () => findCurrentRole(experienceData, contactData?.title),
    [experienceData, contactData?.title]
  );

  if (error) return <DataError what="the portfolio" className="error-aboutme" />;

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
            onContactSelect={openContact}
            onSkillSelect={setSelectedSkill}
            onConnectAssistant={openConnectAssistant}
          />
        </ErrorBoundary>
      </div>

      {selectedContact && (
        <Suspense fallback={<LoadingSpinner />}>
          <ContactModal
            email={contactData.email}
            location={contactData.location}
            country={contactData.country}
            onClose={closeContact}
          />
        </Suspense>
      )}

      <SkillModalHost skillsData={skillsData} skillKey={selectedSkill} onClose={closeSkill} />
      {connectingAssistant && (
        <Suspense fallback={<LoadingSpinner />}>
          <ConnectAssistantModal onClose={closeConnectAssistant} onUseAgent={useMyAgent} />
        </Suspense>
      )}
    </section>
  );
};

export default TLDR;
