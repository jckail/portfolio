import React, { useEffect, useState } from 'react';

import { useThemeStore } from '../../shared/stores/theme-store';
import { getJson } from '../../shared/utils/api';
import { EvidencePanel } from './evidence-panel';
import './agent-page.css';
import { AgentConversation } from './agent-conversation';

import type { PortfolioEvidence } from './public-evidence';

export default function AgentPage() {
  const theme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const [evidence, setEvidence] = useState<PortfolioEvidence | null>(null);
  const [evidenceError, setEvidenceError] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<PortfolioEvidence>('/context.json').then(data => {
      if (active) setEvidence(data);
    }).catch(() => { if (active) setEvidenceError(true); });
    return () => { active = false; };
  }, []);

  return (
    <main className="agent-page" id="main-content">
      <header className="agent-topbar">
        <a className="agent-brand" href={`/?theme=${theme}`}>Jordan Kail<span>Portfolio + personal assistant</span></a>
        <nav aria-label="Assistant navigation">
          <a href={`/?theme=${theme}#projects`}>Portfolio</a>
          <a href="/api/resume">Resume</a>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Dark' : 'Light'} theme
          </button>
        </nav>
      </header>
      <div className="agent-layout">
        <div className="agent-workspace">
          <div className="agent-workspace-intro">
            <div>
              <h1>Chat with my Agent</h1>
              <p className="agent-lede">Explore my work, bring an opportunity, or find out what we could build together.</p>
            </div>
            <button className="agent-evidence-toggle" type="button" aria-expanded={showEvidence}
              aria-controls="agent-portfolio-evidence" onClick={() => setShowEvidence(previous => !previous)}>
              {showEvidence ? 'Hide portfolio evidence' : 'View portfolio evidence'}
            </button>
          </div>
          <AgentConversation />
        </div>
        <div id="agent-portfolio-evidence" className={`agent-evidence-container ${showEvidence ? 'is-expanded' : ''}`}>
        {evidence ? <EvidencePanel evidence={evidence} /> : <aside className="agent-evidence">
          <h2>Explore the portfolio</h2><p>{evidenceError ? 'Portfolio evidence is temporarily unavailable here.' : 'Loading public portfolio evidence…'}</p>
          <a href={`/?theme=${theme}`}>Browse Jordan’s work</a>
        </aside>}
        </div>
      </div>
    </main>
  );
}
