import React, { useEffect, useState } from 'react';

import '../../../../styles/components/modal.css';
import { trackContactOpened, trackContactMessage } from '../../../../shared/utils/analytics';
import { useEscapeKey } from '../../../../shared/hooks/use-escape-key';
import { useFocusTrap } from '../../../../shared/hooks/use-focus-trap';
import { postJson, endpoints } from '../../../../shared/utils/api';
import {
  CONTACT_DRAFT_EVENT,
  clearContactDraft,
  loadContactDraft,
  type ContactDraft,
} from '../../../../shared/utils/contact-draft';

interface ContactModalProps {
  email: string;
  phone: string;
  location: string;
  country: string;
  onClose: () => void;
}

const DEFAULT_FORM = {
  from_email: '',
  subject: 'Connecting via your Portfolio',
  message: 'Hi I wanted to connect ...',
};

function mergeDraft(draft: ContactDraft | null) {
  if (!draft) return { ...DEFAULT_FORM };
  return {
    from_email: draft.from_email ?? DEFAULT_FORM.from_email,
    subject: draft.subject ?? DEFAULT_FORM.subject,
    message: draft.message ?? DEFAULT_FORM.message,
  };
}

const ContactModal: React.FC<ContactModalProps> = ({
  email,
  phone,
  location,
  country,
  onClose
}) => {
  const [formData, setFormData] = useState(() => mergeDraft(loadContactDraft()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fromAssistant, setFromAssistant] = useState(() => Boolean(loadContactDraft()));

  // URL sync (?contact=open and back-button behavior) is owned entirely by
  // the useContact hook; this modal only reports analytics.
  useEffect(() => {
    trackContactOpened();
  }, []);

  useEffect(() => {
    const onDraft = (event: Event) => {
      const detail = (event as CustomEvent<ContactDraft>).detail;
      setFormData(mergeDraft(detail ?? null));
      setFromAssistant(true);
    };
    window.addEventListener(CONTACT_DRAFT_EVENT, onDraft);
    return () => window.removeEventListener(CONTACT_DRAFT_EVENT, onDraft);
  }, []);

  useEscapeKey(onClose);
  const trapRef = useFocusTrap(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await postJson(endpoints.sendEmail, formData);

      // Track successful message submission
      trackContactMessage(formData.message.length);

      setSuccess(true);
      clearContactDraft();
      setFromAssistant(false);
      setFormData({ ...DEFAULT_FORM });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="contact-modal-overlay"
      role="presentation"
      onClick={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="contact-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="Contact"
      >
      <button className="modal-close-button" onClick={onClose} aria-label="Close">&times;</button>

        <div className="contact-modal-header">

          <h5>Contact</h5>

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
            <p className="contact-info">
              ☎️<strong>{phone}</strong>
            </p>
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
                  rows={5}
                />
              </div>

              {error && <div className="contact-error-message">{error}</div>}
              {success && <div className="contact-success-message">Message sent successfully!</div>}

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
      </div>
    </div>
  );
};

export default ContactModal;
