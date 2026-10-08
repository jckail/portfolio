import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { ChatMessages } from '../components/chat/components/ChatMessages';
import { ChatInput } from '../components/chat/components/ChatInput';
import { useChat } from '../components/chat/hooks/useChat';
import { CHAT_PREFILL_KEY } from '../components/sections/modals/skill-modal-actions';
import { validateEmail } from '../components/chat/chat-confirm';
import { clearReceipt, loadReceipt, requestAccess, requestTrial, saveReceipt, verifyReceipt } from './access';
import './agent-page.css';

import type { AccessReceipt } from './access';

/** Shared conversation: full page and drawer use the same server-authoritative access flow. */
export function AgentConversation({ embedded = false }: { embedded?: boolean }) {
  const [receipt, setReceipt] = useState<AccessReceipt | null>(null);
  const [checking, setChecking] = useState(true);
  const [required, setRequired] = useState(false);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const conversation = useRef<HTMLElement>(null);
  const expire = useCallback(() => {
    clearReceipt(); setReceipt(null); setRequired(true);
    setError('Your access expired. Enter your details to continue.');
  }, []);
  const status = useCallback((remaining: number) => {
    setReceipt(previous => {
      if (!previous || previous.mode !== 'trial') return previous;
      const updated = { ...previous, remaining_messages: remaining };
      saveReceipt(updated); return updated;
    });
  }, []);
  const requireAccess = useCallback(() => setRequired(true), []);
  const chat = useChat({ accessToken: receipt?.token, fullPage: true, enabled: !!receipt,
    onAccessExpired: expire, onAccessStatus: status, onAccessRequired: requireAccess });
  const gate = !checking && (required || !receipt || (receipt.mode === 'trial' && receipt.remaining_messages === 0 && !chat.isLoading));

  useLayoutEffect(() => {
    const section = conversation.current;
    const focused = document.activeElement;
    if (!embedded || !section?.getClientRects().length) return;
    // Removing the gate or disabling Send can leave focus on the document body.
    // Keep keyboard interaction inside the pane through every access transition.
    if (focused === document.body || focused === section ||
      (section.contains(focused) && focused?.matches(':disabled'))) {
      const field = section.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled)');
      (field ?? section).focus();
    }
  }, [embedded, checking, gate, chat.isLoading, busy]);

  useEffect(() => {
    let active = true;
    const saved = loadReceipt();
    const access = saved ? verifyReceipt(saved) : requestTrial();
    access.then(granted => { if (active) { saveReceipt(granted); setReceipt(granted); } })
      .catch(() => { if (active) { clearReceipt(); setRequired(true); setError('Introduce yourself to continue, or try again later.'); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!receipt) return;
    const timer = setTimeout(expire, Math.max(0, Date.parse(receipt.expires_at) - Date.now()));
    return () => clearTimeout(timer);
  }, [receipt, expire]);
  const setMessage = chat.setMessage;
  useEffect(() => {
    try {
      const prompt = sessionStorage.getItem(CHAT_PREFILL_KEY);
      sessionStorage.removeItem(CHAT_PREFILL_KEY);
      if (prompt) setMessage(prompt.slice(0, 2000));
    } catch { /* Optional prefill. */ }
  }, [setMessage]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const emailError = validateEmail(email);
    if (emailError || !company.trim()) { setError(emailError ?? 'Enter your company or organization.'); return; }
    setBusy(true); setError('');
    try {
      const granted = await requestAccess(email, company);
      saveReceipt(granted); setReceipt(granted); setRequired(false); setEmail(''); setCompany('');
    } catch { setError('We couldn’t make your introduction. Please try again or use the contact form.'); }
    finally { setBusy(false); }
  };
  const sendMessage = () => {
    if (embedded) conversation.current?.focus();
    chat.handleSendMessage();
  };
  const suggestedPrompt = (prompt: string) => {
    if (embedded) conversation.current?.focus();
    chat.handleSuggestedPrompt(prompt);
  };

  return <section ref={conversation} tabIndex={-1} className="agent-conversation" aria-label="Conversation with Jordan's Agent" data-no-chat-context>
    {!embedded && <div className="agent-conversation-heading"><h2>Grounded in Jordan’s portfolio</h2>
      <a href="/?contact=open">Contact Jordan</a></div>}
    <p className="agent-disclosure">Ask about Jordan’s work, skills, or your opportunity. AI answers can be mistaken.
      Chat messages are stored; avoid confidential information. Review and confirm any message before it is sent. <a href="/privacy/">Privacy and retention</a>.</p>
    {receipt?.mode === 'trial' && !gate && <p className="agent-trial-status" role="status">
      {receipt.remaining_messages} introductory {receipt.remaining_messages === 1 ? 'message' : 'messages'} remaining.
      Then introduce yourself to continue.</p>}
    <ChatMessages messages={chat.messages} isLoading={chat.isLoading}
      showSuggestions={!checking && !gate && chat.showSuggestions} onSuggestedPrompt={suggestedPrompt}
      pendingActions={chat.pendingActions} onConfirmAction={chat.confirmAction}
      onCancelAction={chat.cancelAction} portfolioCards={chat.portfolioCards} />
    {checking ? <p role="status">Preparing your conversation…</p> : gate
      ? <form className="agent-access-form agent-inline-gate" onSubmit={submit} noValidate aria-busy={busy}>
        <h3>Let’s make an introduction</h3>
        <p className="agent-muted">Enter your email and company to continue. Jordan receives these details so he knows who is exploring his work.</p>
        <label htmlFor={`${id}-email`}>Your email</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required
          value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
        <label htmlFor={`${id}-company`}>Company or organization</label>
        <input id={`${id}-company`} name="company" autoComplete="organization" maxLength={160} required
          value={company} disabled={busy} onChange={event => setCompany(event.target.value)} />
        {error && <p className="agent-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Making your introduction…' : 'Continue the conversation →'}</button>
        <a className="agent-contact-link" href="/?contact=open">Prefer a direct message?</a>
      </form>
      : <ChatInput message={chat.message} setMessage={chat.setMessage}
        handleSendMessage={sendMessage} isLoading={chat.isLoading} />}
  </section>;
}
