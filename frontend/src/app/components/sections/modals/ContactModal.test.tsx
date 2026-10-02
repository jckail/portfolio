import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import ContactModal from './ContactModal';
import { postJson } from '../../../../shared/utils/api';

vi.mock('../../../../shared/utils/api', async importOriginal => ({
  ...await importOriginal<typeof import('../../../../shared/utils/api')>(),
  postJson: vi.fn(),
}));

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

describe('ContactModal submission announcements', () => {
  it.each([true, false])('announces successful or failed submission (success=%s)', async success => {
    if (success) vi.mocked(postJson).mockResolvedValue({});
    else vi.mocked(postJson).mockRejectedValue(new Error('Please try again'));
    renderModal();
    fireEvent.change(screen.getByLabelText('Your Email:'), { target: { value: 'visitor@example.com' } });
    fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText('Send me a message:'), { target: { value: 'Hello Jordan' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form')!);
    expect(await screen.findByRole(success ? 'status' : 'alert')).toHaveTextContent(success ? 'Message sent successfully!' : 'Please try again');
  });
});
