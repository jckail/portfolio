import React, { useId, useState } from 'react';

import { postJson, endpoints } from '../../../../shared/utils/api';

// Kept for the rest of the tab's session so reopening the dialog does not
// ask again (and does not send Jordan a second notification).
export const PHONE_SESSION_KEY = 'portfolio.contactPhone';

// Mirrors PhoneRequest in backend/app/api/contact_routes.py.
const EMAIL_MAX_LENGTH = 254;

export const PHONE_ERROR_MESSAGE =
  "Couldn't share the phone number right now. Please use the contact form below.";

function loadStoredPhone(): string | null {
  try {
    return window.sessionStorage.getItem(PHONE_SESSION_KEY);
  } catch {
    return null;
  }
}

function storePhone(phone: string) {
  try {
    window.sessionStorage.setItem(PHONE_SESSION_KEY, phone);
  } catch {
    // Storage blocked (private mode, sandboxed preview): still show it now.
  }
}

/** Digits and a leading + only, so the tel: href is always well formed. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

interface PhoneResponse {
  phone: string;
}

/**
 * "Phone: available on request". The number is not in the public contact
 * payload; POST /api/contact/phone returns it after emailing Jordan the
 * visitor's address.
 */
const PhoneReveal: React.FC = () => {
  const [phone, setPhone] = useState<string | null>(loadStoredPhone);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await postJson<PhoneResponse>(endpoints.contactPhone, { email: email.trim() });
      if (!result?.phone) throw new Error('No phone number in response');
      storePhone(result.phone);
      setPhone(result.phone);
    } catch {
      // Server detail strings are generic already, but a single message keeps
      // the copy consistent across 422 / 429 / 502 / 503.
      setError(PHONE_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  if (phone) {
    return (
      <div className="contact-phone">
        <p className="contact-info">
          ☎️<a className="contact-phone-link" href={telHref(phone)}>{phone}</a>
        </p>
      </div>
    );
  }

  return (
    <form className="contact-phone" onSubmit={handleSubmit} aria-label="Request phone number">
      <p className="contact-phone-title">☎️ Phone: available on request</p>
      <div className="contact-phone-row">
        <label htmlFor={inputId} className="contact-phone-label">
          Your email
        </label>
        <input
          type="email"
          id={inputId}
          name="phone_request_email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          maxLength={EMAIL_MAX_LENGTH}
          autoComplete="email"
          placeholder="your.email@example.com"
          aria-describedby={hintId}
          className="contact-phone-input"
        />
        <button type="submit" className="contact-phone-button" disabled={isLoading}>
          {isLoading ? 'Requesting…' : 'Show phone number'}
        </button>
      </div>
      <p id={hintId} className="contact-phone-hint">
        Jordan gets an email with your address when you request his number.
      </p>
      {error && (
        <p className="contact-phone-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default PhoneReveal;
