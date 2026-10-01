import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import ContactModal from './ContactModal';

vi.mock('../../../../shared/utils/analytics', () => ({
  trackContactOpened: vi.fn(),
  trackContactMessage: vi.fn(),
}));

afterEach(() => cleanup());

const renderModal = () =>
  render(
    <ContactModal email="a@example.com" location="Denver" country="USA" onClose={() => {}} />
  );

describe('ContactModal fields', () => {
  it('caps each field at the backend EmailMessage limit', () => {
    renderModal();
    // backend/app/api/contact_routes.py: subject <= 150, message <= 5000;
    // EmailStr rejects addresses longer than 254.
    expect(screen.getByLabelText('Your Email:')).toHaveAttribute('maxlength', '254');
    expect(screen.getByLabelText('Subject:')).toHaveAttribute('maxlength', '150');
    expect(screen.getByLabelText('Send me a message:')).toHaveAttribute('maxlength', '5000');
  });

  it('gives every field an id and a name', () => {
    renderModal();
    const fields = screen.getByRole('dialog').querySelectorAll('input, textarea, select');
    // from_email, subject, message, plus the phone-request email.
    expect(fields.length).toBe(4);
    fields.forEach(field => {
      expect(field.id).not.toBe('');
      expect(field.getAttribute('name')).toBeTruthy();
    });
  });
});

describe('ContactModal phone', () => {
  it('does not render a phone number; it offers the on-request control', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.getByText(/Phone: available on request/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show phone number' })).toBeInTheDocument();
  });
});
