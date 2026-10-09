import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { useThemeStore } from '../../shared/stores/theme-store';
import { getJson } from '../../shared/utils/api';
import { EvidencePanel } from './evidence-panel';
import './agent-page.css';
import { AgentConversation } from './agent-conversation';

import type { PortfolioEvidence } from './public-evidence';

const ConnectAssistantModal = lazy(() => import('../components/sections/modals/ConnectAssistantModal'));

export default function AgentPage() {
  const theme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const [evidence, setEvidence] = useState<PortfolioEvidence | null>(null);
  const [evidenceError, setEvidenceError] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [connectingAgent, setConnectingAgent] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const useMyAgent = () => {
    setConnectingAgent(false);
    requestAnimationFrame(() => workspace.current?.querySelector<HTMLElement>('textarea:not([disabled]), input:not([disabled])')?.focus());
  };

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
        <a className="agent-brand" href={`/?theme=${theme}`}>
          <span className="agent-brand-mark" aria-hidden="true">JK</span>
          <span className="agent-brand-name">Jordan Kail<span>Engineering, in conversation</span></span>
        </a>
        <nav aria-label="Agent navigation">
          <a href={`/?theme=${theme}#projects`}>Explore portfolio</a>
          <a href="/api/resume">Resume PDF</a>
          <button className="agent-theme-switch" type="button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {theme === 'light'
                ? <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
                : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
            </svg>
          </button>
        </nav>
      </header>
      <div className="agent-page-intro">
        <div>
          <h1>Chat with my Agent</h1>
          <p className="agent-lede">Get to know the work behind the portfolio.</p>
        </div>
        <p className="agent-intro-note">Explore my engineering experience, find a project worth discussing,
          or bring an opportunity we could build together.</p>
      </div>
      <div className="agent-layout">
        <div className="agent-workspace" ref={workspace}>
          <div className="agent-workspace-intro">
            <p className="agent-workspace-label">Your conversation</p>
            <button className="agent-connect-link" type="button" aria-haspopup="dialog" onClick={() => setConnectingAgent(true)}>Connect your agent</button>
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
      {connectingAgent && <Suspense fallback={<p role="status">Loading agent connections…</p>}>
        <ConnectAssistantModal onClose={() => setConnectingAgent(false)} onUseAgent={useMyAgent} />
      </Suspense>}
    </main>
  );
}
