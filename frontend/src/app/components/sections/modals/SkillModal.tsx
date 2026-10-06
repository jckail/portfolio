import React, { useEffect, useId, useMemo, useRef } from 'react';

import SkillIcon from '../../../../shared/components/skill-icon/SkillIcon';
import { CopyLinkButton } from '../../../../shared/components/copy-link-button';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { useChatAvailable } from '../../../../shared/hooks/use-chat-available';
import { trackModalView } from '../../../../shared/utils/analytics';
import { getOwn } from '../../../../shared/utils/lookup';
import {
  categoryPosition,
  formatTag,
  relatedSkills,
  skillChatPrompt,
  skillUsage,
} from '../../../../shared/utils/skills';
import { shareUrl } from '../../../../shared/utils/url-params';
import { useData } from '../../../providers/data-provider';
import { askAssistant, openProject, openRole } from './skill-modal-actions';

import type { Skill, SkillsData } from '../../../../types/skills';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/skill-modal.css';

interface SkillModalProps {
  skill: Skill;
  /** Data key used for the shareable ?skill= deep link. */
  skillKey: string;
  skillsData: SkillsData;
  onClose: () => void;
  /** Move to another skill without closing the dialog. */
  onNavigate: (skillKey: string) => void;
}

const yearsLabel = (years: number) => `${years} ${years === 1 ? 'year' : 'years'}`;

/** Arrow keys belong to text fields and the like; leave them alone there. */
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// URL sync (the ?skill= param and back-button behavior) belongs to whichever
// section owns the selection (useSkill in Skills, local state elsewhere).
const SkillModal: React.FC<SkillModalProps> = ({
  skill,
  skillKey,
  skillsData,
  onClose,
  onNavigate,
}) => {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const shownKey = useRef(skillKey);
  const chatAvailable = useChatAvailable();
  const { experienceData, projectsData, isLoading } = useData();

  useEffect(() => {
    trackModalView(skillKey, 'skill', skill.display_name);
  }, [skillKey, skill.display_name]);

  const usage = useMemo(
    () => skillUsage(skillsData, skillKey, { experienceData, projectsData }),
    [skillsData, skillKey, experienceData, projectsData]
  );
  const related = useMemo(() => relatedSkills(skillsData, skillKey), [skillsData, skillKey]);
  const position = useMemo(() => categoryPosition(skillsData, skillKey), [skillsData, skillKey]);
  const previous = getOwn(skillsData, position?.previous);
  const next = getOwn(skillsData, position?.next);

  // After moving to another skill, announce it by focusing its title and show
  // the top of the new content. Not on first mount: the focus trap owns that.
  useEffect(() => {
    if (shownKey.current === skillKey) return;
    shownKey.current = skillKey;
    titleRef.current?.focus({ preventScroll: true });
    const scroller = titleRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (scroller) scroller.scrollTop = 0;
  }, [skillKey]);

  // Left/Right step through the category while focus is inside the dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (isTypingTarget(event.target)) return;
      // The dialog, not just the content: the close button is its sibling
      const dialog = rootRef.current?.closest('[role="dialog"]');
      if (!dialog || !dialog.contains(document.activeElement)) return;
      const target = event.key === 'ArrowLeft' ? position?.previous : position?.next;
      if (!target) return;
      event.preventDefault();
      onNavigate(target);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [position?.previous, position?.next, onNavigate]);

  const examples = Object.entries(skill.examples ?? {});
  const hasUsage = usage.roles.length > 0 || usage.projects.length > 0;

  return (
    <DialogShell
      overlayClassName="skill-modal-overlay"
      className="skill-modal-content skm"
      labelledBy={titleId}
      onClose={onClose}
      closeButton
    >
      <div ref={rootRef} className="skm-root">
        <div className="skm-header">
          <div className="skm-icon" aria-hidden="true">
            <SkillIcon name={skill.image} className="skm-icon-img" size={56} />
          </div>
          <div className="skm-heading">
            <h2 id={titleId} ref={titleRef} tabIndex={-1}>
              {skill.display_name}
            </h2>
            <p className="skm-meta">
              <span className="skm-category">{skill.general_category}</span>
              {skill.sub_category && <span className="skm-subcategory">{skill.sub_category}</span>}
            </p>
            <p className="skm-experience">
              <strong>
                {skill.years_of_experience > 0
                  ? yearsLabel(skill.years_of_experience)
                  : 'Hands-on use'}
              </strong>
              {skill.professional_experience
                ? ' · Professional experience'
                : ' · Personal and project experience'}
            </p>
          </div>
        </div>

        <p className="skm-description">{skill.description}</p>

        {skill.tags.length > 0 && (
          <ul className="skm-tags" aria-label="Tags">
            {skill.tags.map((tag) => (
              <li key={tag} className="skill-tag">
                {formatTag(tag)}
              </li>
            ))}
          </ul>
        )}

        {examples.length > 0 && (
          <section className="skm-section" aria-labelledby={`${titleId}-examples`}>
            <h3 id={`${titleId}-examples`}>Examples</h3>
            <ul className="skm-examples">
              {examples.map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="skm-section" aria-labelledby={`${titleId}-used`} aria-busy={isLoading}>
          <h3 id={`${titleId}-used`}>Where I&apos;ve used it</h3>
          {isLoading && !experienceData && !projectsData ? (
            <p className="skm-muted" role="status">
              Loading roles and projects…
            </p>
          ) : !hasUsage ? (
            <p className="skm-muted skm-empty">
              Not tied to a specific role or project on this site yet. The description above is
              general background on the technology.
            </p>
          ) : (
            <>
              {usage.roles.length > 0 && (
                <p className="skm-sublabel" aria-hidden="true">
                  Roles
                </p>
              )}
              {usage.roles.length > 0 && (
                <ul className="skm-roles" aria-label="Roles">
                  {usage.roles.map((role) => (
                    <li key={role.key}>
                      <button
                        type="button"
                        className="skm-role"
                        onClick={() => openRole(role.key, onClose)}
                      >
                        <span className="skm-role-company">{role.company}</span>
                        <span className="skm-role-title">{role.title}</span>
                        <span className="skm-role-date">{role.date}</span>
                        <span className="sr-only"> (opens role details)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {usage.projects.length > 0 && (
                <p className="skm-sublabel" aria-hidden="true">
                  Projects
                </p>
              )}
              {usage.projects.length > 0 && (
                <ul className="skm-chips" aria-label="Projects">
                  {usage.projects.map((project) => (
                    <li key={project.key}>
                      <button
                        type="button"
                        className="skm-chip"
                        onClick={() => openProject(project.key, onClose)}
                      >
                        {project.title}
                        <span className="sr-only"> (opens project)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {related.length > 0 && (
          <section className="skm-section" aria-labelledby={`${titleId}-related`}>
            <h3 id={`${titleId}-related`}>Related skills</h3>
            <ul className="skm-chips">
              {related.map((key) => {
                const other = getOwn(skillsData, key);
                if (!other) return null;
                return (
                  <li key={key}>
                    <button type="button" className="skm-chip" onClick={() => onNavigate(key)}>
                      <span aria-hidden="true" className="skm-chip-icon-wrap">
                        <SkillIcon name={other.image} className="skm-chip-icon" size={16} />
                      </span>
                      {other.display_name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="skm-actions">
          {chatAvailable && (
            <button
              type="button"
              className="skm-ask"
              onClick={() => askAssistant(skillChatPrompt(skill), onClose)}
            >
              Ask the assistant about this
            </button>
          )}
          {skill.weblink && (
            <a href={skill.weblink} target="_blank" rel="noopener noreferrer" className="skm-docs">
              {skill.display_name} docs<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <CopyLinkButton
            url={shareUrl('skill', skillKey)}
            label="Copy link"
            className="copy-link-button skm-copy"
          />
        </div>

        {position && position.total > 1 && (
          <nav className="skm-pager" aria-label={`More in ${position.category}`}>
            <button
              type="button"
              className="skm-step"
              disabled={!previous}
              onClick={() => position.previous && onNavigate(position.previous)}
            >
              <span aria-hidden="true">←</span>
              <span className="skm-step-label">
                <span className="skm-step-hint">Previous</span>
                <span className="skm-step-name">{previous?.display_name ?? '—'}</span>
              </span>
            </button>
            <p className="skm-position" aria-live="polite">
              {position.index + 1} of {position.total}
              <span className="sr-only"> in {position.category}</span>
            </p>
            <button
              type="button"
              className="skm-step skm-step-next"
              disabled={!next}
              onClick={() => position.next && onNavigate(position.next)}
            >
              <span className="skm-step-label">
                <span className="skm-step-hint">Next</span>
                <span className="skm-step-name">{next?.display_name ?? '—'}</span>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        )}
      </div>
    </DialogShell>
  );
};

export default SkillModal;
