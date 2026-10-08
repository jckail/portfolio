import React, { useEffect, useState } from 'react';

import { useSectionStore } from '../../stores/section-store';
import { scrollToSection } from '../../utils/scroll-utils';
import '../../../styles/components/navigation/scroll-navigation.css';

const SECTIONS = [
  ['about', 'About'], ['projects', 'Projects'], ['experience', 'Experience'],
  ['skills', 'Skills'], ['resume', 'Résumé'],
] as const;

/** A quiet navigation rail below the header, away from the bottom-right agent. */
export default function ScrollNavigation() {
  const [visible, setVisible] = useState(false);
  const current = useSectionStore(state => state.currentSection);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 240);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;
  return (
    <nav className="scroll-navigation" aria-label="Page timeline">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} aria-current={current === id ? 'location' : undefined}
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            scrollToSection(id);
          }}>
          <span className="scroll-navigation-dot" aria-hidden="true" />{label}
        </a>
      ))}
    </nav>
  );
}
