import React from 'react';

import { useSectionStore } from '../../stores/section-store';
import { useTimelineNavigation } from '../../hooks/use-timeline-navigation';
import '../../../styles/components/navigation/scroll-navigation.css';

const SECTIONS = [
  ['about', 'About'], ['projects', 'Projects'], ['experience', 'Experience'],
  ['skills', 'Skills'], ['resume', 'Résumé'],
] as const;

/** One quiet rail: page sections everywhere, dated career milestones in Experience. */
export default function ScrollNavigation() {
  const current = useSectionStore(state => state.currentSection);
  const { sentinel, visible, active, targets } = useTimelineNavigation();
  const inExperience = current === 'experience' && targets.length > 0;
  return <>
    <span ref={sentinel} className="scroll-navigation-sentinel" aria-hidden="true" />
    <nav className={`scroll-navigation${visible ? ' is-visible' : ''}`}
      aria-label="Page timeline" aria-hidden={!visible}
      ref={node => { node?.toggleAttribute('inert', !visible); }}>
      <div className="scroll-navigation-sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-current={current === id ? 'location' : undefined}>
            <span className="scroll-navigation-dot" aria-hidden="true" />{label}
          </a>
        ))}
      </div>
      <label className="scroll-navigation-select scroll-navigation-page-select">
        <span className="sr-only">Jump to section</span>
        <select value={current} onChange={event => { window.location.hash = event.target.value; }}>
          {SECTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {inExperience && <label className="scroll-navigation-select scroll-navigation-milestones">
        <span className="sr-only">Jump to career milestone</span>
        <select value={targets.some(target => target.id === active) ? active : targets[0].id}
          onChange={event => { window.location.hash = event.target.value; }}>
          <optgroup label="Career milestones">
            {targets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
          </optgroup>
          <optgroup label="Engineering work"><option value="projects">Explore project case studies</option></optgroup>
        </select>
      </label>}
    </nav>
  </>;
}
