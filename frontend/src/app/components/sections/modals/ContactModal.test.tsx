import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ContactModal from './ContactModal';
import { postJson } from '../../../../shared/utils/api';

vi.mock('../../../../shared/utils/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/utils/api')>()),
  postJson: vi.fn(),
}));

vi.mock('../../../../shared/utils/analytics', () => ({
  trackContactOpened: vi.fn(),
  trackContactMessage: vi.fn(),
}));

afterEach(() => cleanup());

const renderModal = () =>
  render(<ContactModal email="a@example.com" location="Denver" country="USA" onClose={() => {}} />);

describe('ContactModal fields', () => {
  it('keeps fields focused and editable through sequential typing, including shortcut characters', async () => {
    const user = userEvent.setup();
    renderModal();
    const entries = [
      ['Your Email:', 'visitor@example.com'],
      ['Subject:', 'Hello / engineering?'],
      ['Send me a message:', 'Hi Jordan, can we discuss agent platforms?\nThanks!'],
      ['Your email', 'phone@example.com'],
    ];
    for (const [label, value] of entries) {
      const field = screen.getByLabelText(label);
      await act(async () => {
        await user.clear(field);
        await user.type(field, value);
      });
      expect(field).toHaveValue(value);
      expect(field).toHaveFocus();
      expect(screen.getByLabelText(label)).toBe(field);
    }
  });

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
    fields.forEach((field) => {
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
  it('preserves an unsuccessful draft and offers an encoded owner-only email fallback', async () => {
    const user = userEvent.setup();
    vi.mocked(postJson).mockRejectedValue(new Error('Unable to send message right now'));
    renderModal();
    await act(async () => {
      await user.type(screen.getByLabelText('Your Email:'), 'visitor@example.com');
      await user.clear(screen.getByLabelText('Subject:'));
      await user.type(screen.getByLabelText('Subject:'), 'Agents & hiring?');
      await user.clear(screen.getByLabelText('Send me a message:'));
      await user.type(screen.getByLabelText('Send me a message:'), 'Hello Jordan\nCan we talk?');
      await user.click(screen.getByRole('button', { name: 'Send Message' }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Your message has not been sent');
    expect(screen.getByLabelText('Your Email:')).toHaveValue('visitor@example.com');
    expect(screen.getByLabelText('Send me a message:')).toHaveValue('Hello Jordan\nCan we talk?');
    expect(
      screen.getByRole('link', { name: 'Send this draft with your email app' })
    ).toHaveAttribute(
      'href',
      'mailto:a@example.com?subject=Agents%20%26%20hiring%3F&body=Hello%20Jordan%0ACan%20we%20talk%3F'
    );
  });

  it.each([true, false])(
    'announces successful or failed submission (success=%s)',
    async (success) => {
      if (success) vi.mocked(postJson).mockResolvedValue({});
      else vi.mocked(postJson).mockRejectedValue(new Error('Please try again'));
      renderModal();
      fireEvent.change(screen.getByLabelText('Your Email:'), {
        target: { value: 'visitor@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Hello' } });
      fireEvent.change(screen.getByLabelText('Send me a message:'), {
        target: { value: 'Hello Jordan' },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Send Message' }).closest('form')!);
      expect(await screen.findByRole(success ? 'status' : 'alert')).toHaveTextContent(
        success ? 'Message sent successfully!' : 'Please try again'
      );
    }
  );
});
