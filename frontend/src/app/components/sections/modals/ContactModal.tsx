import React, { useEffect, useId, useRef, useState } from 'react';

import '../../../../styles/components/modal.css';
import { DialogShell } from '../../../../shared/components/dialog-shell';
import { trackContactOpened, trackContactMessage } from '../../../../shared/utils/analytics';
import { postJson, endpoints } from '../../../../shared/utils/api';
import {
  CONTACT_DRAFT_EVENT,
  CONTACT_SUBJECT_LIMIT,
  captureContactDraft,
  clearContactDraft,
  loadContactDraft,
  normalizeContactDraft,
  type ContactDraft,
} from '../../../../shared/utils/contact-draft';
import PhoneReveal from './PhoneReveal';

interface ContactModalProps {
  email: string;
  location: string;
  country: string;
  onClose: () => void;
}

// Mirror the EmailMessage caps in backend/app/api/contact_routes.py
// (EmailStr itself rejects addresses over 254 characters).
const CONTACT_LIMITS = {
  from_email: 254,
  subject: CONTACT_SUBJECT_LIMIT,
  message: 5000,
} as const;

const DEFAULT_FORM = {
  from_email: '',
  subject: 'Connecting via your Portfolio',
  message: 'Hi I wanted to connect ...',
};

function mergeDraft(draft: ContactDraft | null) {
  draft = normalizeContactDraft(draft);
  if (!draft) return { ...DEFAULT_FORM };
  return {
    from_email: draft.from_email ?? DEFAULT_FORM.from_email,
    subject: draft.subject ?? DEFAULT_FORM.subject,
    message: draft.message ?? DEFAULT_FORM.message,
  };
}

const ContactModal: React.FC<ContactModalProps> = ({
  email,
  location,
  country,
  onClose
}) => {
  const [formData, setFormData] = useState(() => mergeDraft(loadContactDraft()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<'sent' | 'draft-kept' | null>(null);
  const revision = useRef(0);
  const pending = useRef(false);
  const session = useRef({ mounted: false, generation: 0 });
  const [fromAssistant, setFromAssistant] = useState(() => Boolean(loadContactDraft()));

  // URL sync (?contact=open and back-button behavior) is owned entirely by
  // the useContact hook; this modal only reports analytics.
  useEffect(() => {
    const activeSession = session.current;
    activeSession.mounted = true;
    activeSession.generation += 1;
    trackContactOpened();
    return () => {
      activeSession.mounted = false;
      activeSession.generation += 1;
    };
  }, []);

  useEffect(() => {
    const onDraft = (event: Event) => {
      const detail = (event as CustomEvent<ContactDraft>).detail;
      revision.current += 1;
      setSuccess(null);
      setFormData(mergeDraft(detail ?? null));
      setFromAssistant(true);
    };
    window.addEventListener(CONTACT_DRAFT_EVENT, onDraft);
    return () => window.removeEventListener(CONTACT_DRAFT_EVENT, onDraft);
  }, []);

  const titleId = useId();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    revision.current += 1;
    setSuccess(null);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    const submitted = Object.freeze({ ...formData });
    const submittedRevision = revision.current;
    const submittedSession = session.current.generation;
    const storedDraft = captureContactDraft();
    const isCurrentSession = () => session.current.mounted &&
      session.current.generation === submittedSession;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await postJson(endpoints.sendEmail, submitted);
      trackContactMessage(submitted.message.length);
      if (!isCurrentSession()) return;

      if (revision.current === submittedRevision) {
        clearContactDraft(storedDraft);
        setFromAssistant(false);
        setFormData({ ...DEFAULT_FORM });
        setSuccess('sent');
      } else {
        setSuccess('draft-kept');
      }
    } catch (err) {
      if (isCurrentSession()) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      pending.current = false;
      if (isCurrentSession()) setIsLoading(false);
    }
  };

  return (
    <DialogShell
      overlayClassName="contact-modal-overlay"
      className="contact-modal-content"
      labelledBy={titleId}
      onClose={onClose}
      closeButton
    >
      <div className="contact-modal-header">
        <h2 id={titleId}>Contact</h2>
      </div>

      <div className="contact-modal-body">
        <div className="contact-details">
          <p className="contact-info">
            🏔️<strong>{location}</strong>
          </p>
          <p className="contact-info">
            📧<strong>{email}</strong>
          </p>
          <p className="contact-info">
            🇺🇸<strong>{country}</strong>
          </p>
          <PhoneReveal />
        </div>

        <div className="contact-form-container">
          {fromAssistant && (
            <p className="contact-draft-note" role="status">
              Drafted by the AI assistant — edit anything before sending.
            </p>
          )}
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form-group">
              <label htmlFor="from_email">Your Email:</label>
              <input
                type="email"
                id="from_email"
                name="from_email"
                value={formData.from_email}
                onChange={handleInputChange}
                required
                maxLength={CONTACT_LIMITS.from_email}
                autoComplete="email"
                placeholder="your.email@example.com"
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="subject">Subject:</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                maxLength={CONTACT_LIMITS.subject}
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="message">Send me a message:</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                maxLength={CONTACT_LIMITS.message}
                rows={5}
              />
            </div>

            {error && <div className="contact-error-message" role="alert">{error}</div>}
            {success && <div className="contact-success-message" role="status">
              {success === 'draft-kept'
                ? 'Your earlier message was sent. Your current draft has been kept.'
                : 'Message sent successfully!'}
            </div>}

            <button
              type="submit"
              className="contact-submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </DialogShell>
  );
};

export default ContactModal;
