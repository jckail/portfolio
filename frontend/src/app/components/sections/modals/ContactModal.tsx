import React, { useEffect, useState } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/modals/contact-modal.css';
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
    message: 'Hi I wanted to connect ...'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Track modal open
    trackContactOpened();
    
    // Update URL with contact parameter
    const url = new URL(window.location.href);
    url.searchParams.set('contact', 'open');
    
    // Preserve the hash if it exists
    const hash = window.location.hash;
    const urlWithoutHash = url.toString().split('#')[0];
    const finalUrl = hash ? `${urlWithoutHash}${hash}` : urlWithoutHash;
    
    window.history.pushState({ contactModal: true }, '', finalUrl);

    return () => {
      // Remove contact parameter when modal closes
      const closeUrl = new URL(window.location.href);
      closeUrl.searchParams.delete('contact');
      
      // Preserve the hash if it exists
      const closeHash = window.location.hash;
      const closeUrlWithoutHash = closeUrl.toString().split('#')[0];
      const closeFinalUrl = closeHash ? `${closeUrlWithoutHash}${closeHash}` : closeUrlWithoutHash;
      
      window.history.pushState({ contactModal: false }, '', closeFinalUrl);
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
        message: 'Hi I wanted to connect ...'
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
        
        <div className="modal-timeline-header-wrapper">
          <div className="timeline-header">
            <h3>Contact</h3>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="contact-details">
            
            <p className="contact-info">
            📍 <strong>{location}, {country}</strong>
            </p>
            <p className="contact-info">
            📧 <strong>{email}</strong> 
            </p>
            <p className="contact-info">
            ☎️ <strong>{phone}</strong> 
            </p>


          </div>

          <div className="contact-form-container">
            <h4>Send me a message:</h4>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label htmlFor="message">Message:</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={5}
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">Message sent successfully!</div>}

              <button 
                type="submit" 
                className="submit-button"
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
