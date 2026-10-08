import React, { useEffect, useId, useRef, useState } from 'react';

import '../../../../styles/components/modal.css';
import '../../../../styles/components/contact-introduction.css';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackContactOpened, trackContactMessage } from '../../../../shared/utils/analytics';
import { postJson, endpoints } from '../../../../shared/utils/api';
import { CONTACT_DRAFT_EVENT, clearContactDraft, loadContactDraft, type ContactDraft } from '../../../../shared/utils/contact-draft';
import { recommendContactMessage, type ContactIntent } from '../../../../shared/utils/contact-recommendation';

interface ContactModalProps { email: string; location: string; country: string; onClose: () => void }
interface SendResult { phone?: string | null }
const STARTER = 'Hi Jordan, I’d like to connect about your work in AI agents and software engineering. Could we discuss how your experience might help our team?';
function introduction(message: string, email: string, company: string) {
  return [message, [email.trim() && `My email: ${email.trim()}`, company.trim() && `Company: ${company.trim()}`].filter(Boolean).join('\n')].filter(Boolean).join('\n\n');
}
function initialForm(draft: ContactDraft | null) {
  return { from_email: draft?.from_email ?? '', company: draft?.company ?? '',
    subject: draft?.subject ?? 'Connecting via your portfolio', message: draft?.message ?? STARTER };
}
const ContactModal: React.FC<ContactModalProps> = ({ email, location, onClose }) => {
  const [initialDraft] = useState(loadContactDraft);
  const [form, setForm] = useState(() => initialForm(initialDraft));
  const [intent, setIntent] = useState<ContactIntent>('opportunity');
  const [drafting, setDrafting] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [draftError, setDraftError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SendResult | null>(null);
  const [fromAssistant, setFromAssistant] = useState(Boolean(initialDraft));
  const edited = useRef(Boolean(initialDraft));
  const suggestedMessage = useRef(initialDraft?.message ?? STARTER);
  const revision = useRef(0);
  const mounted = useRef(true);
  const titleId = useId();
  const formId = useId();

  useEffect(() => {
    mounted.current = true;
    trackContactOpened();
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const receive = (event: Event) => {
      const draft = (event as CustomEvent<ContactDraft>).detail;
      if (!draft) return;
      edited.current = true;
      revision.current++;
      setForm(initialForm(draft));
      setFromAssistant(true);
      setRecommendation(null);
      setSent(null);
    };
    window.addEventListener(CONTACT_DRAFT_EVENT, receive);
    return () => window.removeEventListener(CONTACT_DRAFT_EVENT, receive);
  }, []);
  useEffect(() => {
    if (initialDraft) return;
    let active = true;
    setDrafting(true);
    setDraftError(false);
    setRecommendation(null);
    recommendContactMessage(intent).then(message => {
      if (!active) return;
      suggestedMessage.current = message;
      if (edited.current) setRecommendation(message);
      else {
        setForm(previous => ({ ...previous, message: introduction(message, previous.from_email, previous.company) }));
        setFromAssistant(true);
      }
    }).catch(() => { if (active) setDraftError(true); })
      .finally(() => { if (active) setDrafting(false); });
    return () => { active = false; };
  }, [initialDraft, intent]);

  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    revision.current++;
    if (name === 'message') edited.current = true;
    setForm(previous => {
      const next = { ...previous, [name]: value };
      if (!edited.current && (name === 'from_email' || name === 'company')) {
        next.message = introduction(suggestedMessage.current, next.from_email, next.company);
      }
      return next;
    });
  };
  const applyRecommendation = () => {
    if (!recommendation) return;
    edited.current = false;
    revision.current++;
    setForm(previous => ({ ...previous, message: introduction(recommendation, previous.from_email, previous.company) }));
    setRecommendation(null);
    setFromAssistant(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    if (!form.company.trim() || !form.message.trim()) {
      setError('Please enter your company and a message.');
      return;
    }
    const submittedRevision = revision.current;
    const submitted = { ...form, from_email: form.from_email.trim(), company: form.company.trim() };
    setIsLoading(true);
    setError(null);
    try {
      const response = await postJson<SendResult>(endpoints.sendEmail, submitted);
      trackContactMessage(submitted.message.length);
      if (mounted.current && revision.current === submittedRevision) {
        clearContactDraft();
        setSent(response ?? {});
      }
    } catch (failure) {
      if (mounted.current && revision.current === submittedRevision) {
        setError(failure instanceof Error ? failure.message : 'Unable to send right now');
      }
    } finally { if (mounted.current) setIsLoading(false); }
  };
  return (
    <DialogShell overlayClassName="contact-modal-overlay" className="contact-modal-content contact-introduction"
      labelledBy={titleId} onClose={onClose} closeButton>
      <header className="contact-intro-header">
        <p className="contact-intro-eyebrow">Let’s connect</p>
        <h2 id={titleId}>Connect with Jordan</h2>
        <p>Bring an opportunity, collaboration, or question. My agent can help put it into words.</p>
      </header>
      <div className="contact-intro-meta"><span>{location}</span><a href={`mailto:${email}`}>{email}</a></div>
      {sent ? (
        <section className="contact-intro-sent" aria-label="Message delivered">
          <h3>Thanks for reaching out.</h3>
          <p role="status">Message sent successfully! Jordan has your email, company, and message.</p>
          {sent.phone ? <><p>You can also reach Jordan by phone:</p>
            <a className="contact-intro-phone" href={`tel:${sent.phone.replace(/[^\d+]/g, '')}`}>{sent.phone}</a></>
            : <p>Jordan can reply to the email you provided. His phone number is temporarily unavailable.</p>}
        </section>
      ) : (
        <form onSubmit={submit} className="contact-form">
          <fieldset className="contact-intro-fields" disabled={isLoading}>
            <legend className="sr-only">Your introduction</legend>
            <div className="contact-intro-identity">
              <div className="contact-form-group"><label htmlFor={`${formId}-email`}>Your email</label>
                <input id={`${formId}-email`} name="from_email" type="email" value={form.from_email}
                  onChange={change} required maxLength={254} autoComplete="email" placeholder="you@company.com" /></div>
              <div className="contact-form-group"><label htmlFor={`${formId}-company`}>Company or organization</label>
                <input id={`${formId}-company`} name="company" value={form.company}
                  onChange={change} required maxLength={150} autoComplete="organization" placeholder="Your company" /></div>
            </div>
            <div className="contact-form-group"><label htmlFor={`${formId}-intent`}>What would you like to discuss?</label>
              <select id={`${formId}-intent`} name="intent" value={intent}
                onChange={event => setIntent(event.target.value as ContactIntent)}>
                <option value="opportunity">An opportunity</option><option value="collaboration">A collaboration</option>
                <option value="question">A question about my work</option>
              </select></div>
            <div className="contact-form-group"><label htmlFor={`${formId}-message`}>Send me a message</label>
              <textarea id={`${formId}-message`} name="message" value={form.message} onChange={change}
                required maxLength={5000} rows={6} aria-describedby={`${formId}-draft-note`} />
              <p id={`${formId}-draft-note`} className="contact-draft-note" role="status">
                {drafting ? 'My agent is preparing a recommendation. You can start editing now.'
                  : draftError ? 'My agent is unavailable right now. This starter message is yours to edit.'
                  : fromAssistant ? 'Recommended by my AI agent — edit anything before sending.' : 'Make this message your own.'}
              </p>
            </div>
            {recommendation && <div className="contact-intro-recommendation">
              <p>Your edits are safe. My agent also suggests:</p><blockquote>{recommendation}</blockquote>
              <button type="button" onClick={applyRecommendation}>Use agent recommendation</button>
            </div>}
            <details className="contact-intro-subject"><summary>Edit subject</summary>
              <div className="contact-form-group"><label htmlFor={`${formId}-subject`}>Subject</label>
                <input id={`${formId}-subject`} name="subject" value={form.subject} onChange={change} required maxLength={150} /></div>
            </details>
          </fieldset>
          {error && <div className="contact-error-message" role="alert">
            <p>{error}. Your message has not been sent. Your draft is still in this form.</p>
            <a href={`mailto:${email}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(introduction(form.message, form.from_email, form.company))}`}>
              Send this draft with your email app</a>
          </div>}
          <p className="contact-intro-submit-note">Send your message to receive Jordan’s phone number. Your details go directly to Jordan.</p>
          <button type="submit" className="contact-submit-button" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send message & connect'}</button>
        </form>
      )}
    </DialogShell>
  );
};
export default ContactModal;
