import React, { useCallback, useEffect, useState } from 'react';

import { useThemeStore } from '../../shared/stores/theme-store';
import { getJson } from '../../shared/utils/api';
import { ChatMessages } from '../components/chat/components/ChatMessages';
import { ChatInput } from '../components/chat/components/ChatInput';
import { useChat } from '../components/chat/hooks/useChat';
import { CHAT_PREFILL_KEY } from '../components/sections/modals/skill-modal-actions';
import { CHAT_STORAGE_KEY } from '../components/chat/chat-storage';
import { validateEmail } from '../components/chat/chat-confirm';
import { clearReceipt, loadReceipt, requestAccess, saveReceipt, verifyReceipt } from './access';
import { EvidencePanel } from './evidence-panel';
import './agent-page.css';

import type { AccessReceipt } from './access';
import type { PortfolioEvidence } from './public-evidence';

function Conversation({ receipt, onExpired }: { receipt: AccessReceipt; onExpired: () => void }) {
  const chat = useChat({ accessToken: receipt.token, fullPage: true, onAccessExpired: onExpired });
  const setMessage = chat.setMessage;
  useEffect(() => {
    try {
      const prompt = sessionStorage.getItem(CHAT_PREFILL_KEY);
      sessionStorage.removeItem(CHAT_PREFILL_KEY);
      if (prompt) setMessage(prompt.slice(0, 2000));
    } catch { /* Optional prefill only. */ }
  }, [setMessage]);
  return (
    <section className="agent-conversation" aria-label="Conversation with Jordan's assistant" data-no-chat-context>
      <div className="agent-conversation-heading">
        <h2>Jordan’s portfolio assistant</h2>
        <span className="agent-muted">Built around published evidence</span>
      </div>
      <p className="agent-disclosure">AI answers can be mistaken. Chat messages are stored; avoid confidential information.
        Review and confirm any message or meeting before it is sent.</p>
      <ChatMessages messages={chat.messages} isLoading={chat.isLoading}
        showSuggestions={chat.showSuggestions} onSuggestedPrompt={chat.handleSuggestedPrompt}
        pendingActions={chat.pendingActions} onConfirmAction={chat.confirmAction}
        onCancelAction={chat.cancelAction} portfolioCards={chat.portfolioCards} />
      <ChatInput message={chat.message} setMessage={chat.setMessage}
        handleSendMessage={chat.handleSendMessage} isLoading={chat.isLoading} />
    </section>
  );
}

export default function AgentPage() {
  const theme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const [receipt, setReceipt] = useState<AccessReceipt | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState<PortfolioEvidence | null>(null);
  const [evidenceError, setEvidenceError] = useState(false);

  const expire = useCallback(() => {
    clearReceipt();
    setReceipt(null);
    setError('Your assistant access expired. Enter your details to start again.');
  }, []);

  useEffect(() => {
    let active = true;
    const saved = loadReceipt();
    if (!saved) { setChecking(false); return; }
    verifyReceipt(saved).then(verified => {
      if (active) { saveReceipt(verified); setReceipt(verified); }
    }).catch(() => { clearReceipt(); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!receipt) return;
    const timer = setTimeout(expire, Math.max(0, Date.parse(receipt.expires_at) - Date.now()));
    return () => clearTimeout(timer);
  }, [receipt, expire]);
  useEffect(() => {
    let active = true;
    getJson<PortfolioEvidence>('/context.json').then(data => {
      if (active) setEvidence(data);
    }).catch(() => { if (active) setEvidenceError(true); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const emailError = validateEmail(email);
    if (emailError || !company.trim()) { setError(emailError ?? 'Enter your company or organization.'); return; }
    setBusy(true); setError('');
    try {
      const granted = await requestAccess(email, company);
      saveReceipt(granted); setReceipt(granted); setEmail(''); setCompany('');
    } catch {
      setError('We couldn’t unlock the assistant. Please try again, or use the contact form.');
    } finally { setBusy(false); }
  };

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
          <p className="agent-eyebrow">A conversation with context</p>
          <h1>Explore what we could build together.</h1>
          <p className="agent-lede">Ask about Jordan’s experience, explore projects, or bring a role or business problem.
            This assistant connects your questions to his public portfolio and helps you take the next step.</p>
          <div className="agent-capabilities" aria-label="What you can explore">
            <span>Experience & skills</span><span>Projects & evidence</span><span>Your opportunity</span><span>Connect with Jordan</span>
          </div>
          {checking ? <p role="status">Checking your assistant access…</p> : receipt
            ? <><Conversation receipt={receipt} onExpired={expire} />
              <button className="agent-end-session" type="button" onClick={() => { clearReceipt(); setReceipt(null); try { sessionStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* Storage unavailable. */ } }}>End assistant session</button></>
            : <form className="agent-access-form" onSubmit={submit} noValidate aria-busy={busy}>
              <p className="agent-eyebrow">Let’s make an introduction</p>
              <h2>Meet Jordan’s assistant</h2>
              <p className="agent-muted">Enter your email and company to continue. Jordan will receive these details
                so he knows who is exploring his work.</p>
              <label htmlFor="agent-email">Your email</label>
              <input id="agent-email" name="email" type="email" autoComplete="email" maxLength={254}
                required value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
              <label htmlFor="agent-company">Company or organization</label>
              <input id="agent-company" name="company" autoComplete="organization" maxLength={160}
                required value={company} disabled={busy} onChange={event => setCompany(event.target.value)} />
              <p className="agent-disclosure">Continuing sends your email and company to Jordan and grants access for this browser session.
                Chat messages are stored. Please keep confidential information out of the conversation.</p>
              {error && <p className="agent-error" role="alert">{error}</p>}
              <button type="submit" disabled={busy}>{busy ? 'Making your introduction…' : 'Start the conversation →'}</button>
              <a className="agent-contact-link" href={`/?theme=${theme}&contact=open`}>Prefer a direct message?</a>
            </form>}
        </div>
        {evidence ? <EvidencePanel evidence={evidence} /> : <aside className="agent-evidence">
          <h2>Explore the portfolio</h2><p>{evidenceError ? 'Portfolio evidence is temporarily unavailable here.' : 'Loading public portfolio evidence…'}</p>
          <a href={`/?theme=${theme}`}>Browse Jordan’s work</a>
        </aside>}
      </div>
    </main>
  );
}
