import React, { useEffect, useState, useRef } from 'react';
import '../../../../styles/components/modal.css';
import { trackContactOpened, trackContactMessage } from '../../../../shared/utils/analytics';

interface ContactModalProps {
  email: string;
  phone: string;
  location: string;
  country: string;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({
  email,
  phone,
  location,
  country,
  onClose
}) => {
  const [formData, setFormData] = useState({
    from_email: '',
    subject: 'Connecting via your Portfolio',
    message: 'Hi Jordan, I wanted to connect '
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const lastUrlState = useRef<string | null>(null);

  const updateUrl = (isOpen: boolean) => {
    const url = new URL(window.location.href);
    
    if (isOpen) {
      url.searchParams.set('contact', 'open');
    } else {
      url.searchParams.delete('contact');
    }

    // Preserve the hash if it exists
    const hash = window.location.hash;
    const urlWithoutHash = url.toString().split('#')[0];
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;

    // Only update if the URL has actually changed
    if (finalUrl !== lastUrlState.current) {
      lastUrlState.current = finalUrl;
      window.history.replaceState({ contactModal: isOpen }, '', finalUrl);
    }
  };

  useEffect(() => {
    // Track modal open
    trackContactOpened();

    // Add modal-open class to body
    document.body.classList.add('modal-open');

    // Update URL when modal opens
    updateUrl(true);

    return () => {
      // Update URL when modal closes
      updateUrl(false);

      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('contact')) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

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
      const response = await fetch('api/contact/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }

      // Track successful message submission
      trackContactMessage(formData.message.length);

      setSuccess(true);
      setFormData({
        from_email: '',
        subject: 'Connecting via your Portfolio',
        message: 'Hi Jordan, I wanted to connect '
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div className="contact-modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      <button className="modal-close-button" onClick={onClose}>&times;</button>

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
