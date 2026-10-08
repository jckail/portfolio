import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ContactModal from './ContactModal';
import { postJson } from '../../../../shared/utils/api';
import { recommendContactMessage } from '../../../../shared/utils/contact-recommendation';
import { saveContactDraft } from '../../../../shared/utils/contact-draft';

vi.mock('../../../../shared/utils/api', async (original) => ({
  ...(await original<typeof import('../../../../shared/utils/api')>()), postJson: vi.fn(),
}));
vi.mock('../../../../shared/utils/contact-recommendation', () => ({ recommendContactMessage: vi.fn() }));
vi.mock('../../../../shared/utils/analytics', () => ({ trackContactOpened: vi.fn(), trackContactMessage: vi.fn() }));
beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.mocked(recommendContactMessage).mockResolvedValue('Hi Jordan, can we discuss your agent-platform experience?');
});
afterEach(cleanup);
const renderModal = () => render(<ContactModal email="a@example.com" location="San Francisco, CA" country="USA" onClose={() => {}} />);
function identify() {
  fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Company or organization'), { target: { value: 'Example Labs' } });
}
describe('contact introduction', () => {
  it('keeps every field editable and focused through keyboard typing', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByText(/Recommended by my AI agent/);
    await act(async () => { await user.click(screen.getByText('Edit subject')); });
    for (const [label, value] of [
      ['Your email', 'visitor@example.com'], ['Company or organization', 'Example / Labs?'],
      ['Subject', 'Hello / engineering?'], ['Send me a message', 'Hi Jordan, agent platforms?\nThanks!'],
    ]) {
      const field = screen.getByLabelText(label);
      await act(async () => { await user.clear(field); await user.type(field, value); });
      expect(field).toHaveValue(value);
      expect(field).toHaveFocus();
      expect(screen.getByLabelText(label)).toBe(field);
    }
  });
  it('generates a public-only recommendation and adds identity locally', async () => {
    renderModal();
    await screen.findByText(/Recommended by my AI agent/);
    identify();
    expect(recommendContactMessage).toHaveBeenCalledWith('opportunity');
    expect(screen.getByLabelText('Send me a message')).toHaveValue(
      'Hi Jordan, can we discuss your agent-platform experience?\n\nMy email: visitor@example.com\nCompany: Example Labs');
    expect(screen.queryByRole('link', { name: /phone/i })).toBeNull();
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')).toBeNull();
    for (const [label, limit] of [['Your email', '254'], ['Company or organization', '150'], ['Subject', '150'], ['Send me a message', '5000']]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('maxlength', limit);
    }
  });
  it('protects manual edits from a late recommendation until explicitly accepted', async () => {
    let finish!: (message: string) => void;
    vi.mocked(recommendContactMessage).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderModal();
    identify();
    fireEvent.change(screen.getByLabelText('Send me a message'), { target: { value: 'My own introduction' } });
    await act(async () => { finish('An agent recommendation'); });
    expect(screen.getByLabelText('Send me a message')).toHaveValue('My own introduction');
    fireEvent.click(screen.getByRole('button', { name: 'Use agent recommendation' }));
    expect(screen.getByLabelText('Send me a message')).toHaveValue(
      'An agent recommendation\n\nMy email: visitor@example.com\nCompany: Example Labs');
  });
  it('uses a supplied assistant draft without making another generation call', () => {
    saveContactDraft({ from_email: 'visitor@example.com', company: 'Example Labs', message: 'Reviewed introduction' });
    renderModal();
    expect(screen.getByLabelText('Send me a message')).toHaveValue('Reviewed introduction');
    expect(screen.getByLabelText('Company or organization')).toHaveValue('Example Labs');
    expect(recommendContactMessage).not.toHaveBeenCalled();
  });
  it('shows an honest editable fallback when AI generation fails', async () => {
    vi.mocked(recommendContactMessage).mockRejectedValue(new Error('Unavailable'));
    renderModal();
    await screen.findByText(/My agent is unavailable/);
    expect((screen.getByLabelText('Send me a message') as HTMLTextAreaElement).value).toContain('Hi Jordan');
    expect(screen.getByLabelText('Your email')).toBeEnabled();
  });
  it('retains identity and message on failure and offers an encoded owner-only fallback', async () => {
    vi.mocked(postJson).mockRejectedValue(new Error('Unable to send message right now'));
    renderModal();
    await screen.findByText(/Recommended by my AI agent/);
    identify();
    fireEvent.change(screen.getByLabelText('Send me a message'), { target: { value: 'Hello & agents?' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send message & connect' }).closest('form')!);
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Your email')).toHaveValue('visitor@example.com');
    expect(screen.getByLabelText('Send me a message')).toHaveValue('Hello & agents?');
    const fallback = new URL(screen.getByRole('link', { name: 'Send this draft with your email app' }).getAttribute('href')!);
    expect(fallback.pathname).toBe('a@example.com');
    expect(fallback.searchParams.get('body')).toContain('Company: Example Labs');
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')).toBeNull();
  });
  it('reveals the returned phone only after accepted delivery', async () => {
    let finish!: (result: { phone: string }) => void;
    vi.mocked(postJson).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderModal();
    await screen.findByText(/Recommended by my AI agent/);
    identify();
    fireEvent.submit(screen.getByRole('button', { name: 'Send message & connect' }).closest('form')!);
    expect(screen.getByLabelText('Your email')).toBeDisabled();
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')).toBeNull();
    await act(async () => { finish({ phone: '+1 (202) 555-0100' }); });
    expect(screen.getByRole('status')).toHaveTextContent('Message sent successfully!');
    expect(screen.getByRole('link', { name: '+1 (202) 555-0100' })).toHaveAttribute('href', 'tel:+12025550100');
    expect(postJson).toHaveBeenCalledWith('/api/contact/send-email', expect.objectContaining({ company: 'Example Labs' }));
  });
  it('does not show a stale send result over a newer assistant draft', async () => {
    let finish!: (result: { phone: string }) => void;
    vi.mocked(postJson).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderModal();
    await screen.findByText(/Recommended by my AI agent/);
    identify();
    fireEvent.submit(screen.getByRole('button', { name: 'Send message & connect' }).closest('form')!);
    act(() => saveContactDraft({ message: 'A newer draft', company: 'New Labs' }));
    await act(async () => { finish({ phone: '+12025550100' }); });
    expect(screen.getByLabelText('Send me a message')).toHaveValue('A newer draft');
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')).toBeNull();
  });
});
