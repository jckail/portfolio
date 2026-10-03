import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

import ContactModal from './ContactModal';
import { postJson } from '../../../../shared/utils/api';
import { trackContactMessage } from '../../../../shared/utils/analytics';
import { CONTACT_DRAFT_EVENT, CONTACT_DRAFT_KEY, loadContactDraft, saveContactDraft } from '../../../../shared/utils/contact-draft';

vi.mock('../../../../shared/utils/api', async importOriginal => ({
  ...await importOriginal<typeof import('../../../../shared/utils/api')>(),
  postJson: vi.fn(),
}));

vi.mock('../../../../shared/utils/analytics', () => ({
  trackContactOpened: vi.fn(),
  trackContactMessage: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});
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


const draftA = { from_email: 'visitor@example.com', subject: 'Subject A', message: 'Message A' };
const draftB = { from_email: 'new@example.com', subject: 'Subject B', message: 'Message B' };
const subjectField = () => screen.getByLabelText('Subject:') as HTMLInputElement;
const messageField = () => screen.getByLabelText('Send me a message:') as HTMLTextAreaElement;
const submit = () => fireEvent.submit(screen.getByRole('button', { name: /Send Message|Sending/ }).closest('form')!);
function pendingPost() {
  let resolve!: (value: object) => void;
  let reject!: (error: Error) => void;
  vi.mocked(postJson).mockReturnValueOnce(new Promise((yes, no) => { resolve = yes; reject = no; }));
  return {
    succeed: () => act(async () => { resolve({}); }),
    fail: () => act(async () => { reject(new Error('Please try again')); }),
  };
}

describe('ContactModal immutable submissions', () => {
  it('resets an untouched submitted draft and tracks its immutable message', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    expect(postJson).toHaveBeenCalledWith(expect.any(String), draftA);
    await request.succeed();
    expect(subjectField()).toHaveValue('Connecting via your Portfolio');
    expect(messageField()).toHaveValue('Hi I wanted to connect ...');
    expect(loadContactDraft()).toBeNull();
    expect(trackContactMessage).toHaveBeenCalledWith(draftA.message.length);
    expect(screen.getByRole('status')).toHaveTextContent('Message sent successfully!');
  });

  it('preserves edits made while the earlier message is sending', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    fireEvent.change(messageField(), { target: { value: draftB.message } });
    await request.succeed();
    expect(messageField()).toHaveValue(draftB.message);
    expect(loadContactDraft()).toEqual(draftA);
    expect(vi.mocked(postJson).mock.calls[0][1]).toEqual(draftA);
    expect(trackContactMessage).toHaveBeenCalledWith(draftA.message.length);
    expect(screen.getByText(/earlier message was sent/)).toHaveTextContent('current draft has been kept');
  });

  it('preserves an edit away and back despite identical final values', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    fireEvent.change(subjectField(), { target: { value: 'Temporary edit' } });
    fireEvent.change(subjectField(), { target: { value: draftA.subject } });
    await request.succeed();
    expect(subjectField()).toHaveValue(draftA.subject);
    expect(loadContactDraft()).toEqual(draftA);
    expect(screen.getByText(/earlier message was sent/)).toBeInTheDocument();
  });

  it.each([draftA, draftB])('preserves a later saved draft event (%s)', async newer => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    act(() => saveContactDraft(newer));
    await request.succeed();
    expect(subjectField()).toHaveValue(newer.subject);
    expect(messageField()).toHaveValue(newer.message);
    expect(loadContactDraft()).toEqual(newer);
    expect(screen.getByText(/earlier message was sent/)).toBeInTheDocument();
  });

  it('preserves even a same-value direct event that does not write storage', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    act(() => window.dispatchEvent(new CustomEvent(CONTACT_DRAFT_EVENT, { detail: draftA })));
    await request.succeed();
    expect(subjectField()).toHaveValue(draftA.subject);
    expect(loadContactDraft()).toEqual(draftA);
  });

  it.each([true, false])('old completion cannot mutate a reopened modal or global draft (success=%s)', async success => {
    saveContactDraft(draftA);
    const request = pendingPost();
    const old = renderModal();
    submit();
    old.unmount();
    saveContactDraft(draftB);
    renderModal();
    if (success) await request.succeed();
    else await request.fail();
    expect(subjectField()).toHaveValue(draftB.subject);
    expect(loadContactDraft()).toEqual(draftB);
    expect(screen.queryByText(/Message sent successfully|earlier message was sent|Please try again/)).toBeNull();
  });

  it('does not clear independently replaced storage on successful completion', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(draftB));
    await request.succeed();
    expect(loadContactDraft()).toEqual(draftB);
  });

  it('retains current edits and persisted draft after failure', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    act(() => saveContactDraft(draftB));
    await request.fail();
    expect(subjectField()).toHaveValue(draftB.subject);
    expect(loadContactDraft()).toEqual(draftB);
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again');
    expect(trackContactMessage).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions while a request is pending', async () => {
    saveContactDraft(draftA);
    const request = pendingPost();
    renderModal();
    submit();
    submit();
    expect(postJson).toHaveBeenCalledTimes(1);
    await request.succeed();
  });

  it.each(['storage', 'event'])('normalizes a legacy overlong subject arriving from %s before submission', async source => {
    const legacy = { ...draftA, subject: 's'.repeat(200) };
    if (source === 'storage') sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(legacy));
    const request = pendingPost();
    renderModal();
    if (source === 'event') act(() => window.dispatchEvent(new CustomEvent(CONTACT_DRAFT_EVENT, { detail: legacy })));
    expect(subjectField()).toHaveValue('s'.repeat(150));
    submit();
    expect(postJson).toHaveBeenCalledWith(expect.any(String), { ...legacy, subject: 's'.repeat(150) });
    await request.succeed();
  });
});
