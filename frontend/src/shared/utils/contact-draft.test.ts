import { describe, it, expect, beforeEach } from 'vitest';

import {
  CONTACT_DRAFT_KEY,
  saveContactDraft,
  loadContactDraft,
  clearContactDraft,
  captureContactDraft,
} from './contact-draft';

describe('contact-draft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a draft', () => {
    saveContactDraft({
      from_email: 'a@b.com',
      subject: 'Hi',
      message: 'Hello',
    });
    expect(loadContactDraft()).toEqual({
      from_email: 'a@b.com',
      subject: 'Hi',
      message: 'Hello',
    });
    expect(sessionStorage.getItem(CONTACT_DRAFT_KEY)).toBeTruthy();
  });

  it('normalizes legacy subjects and rejects malformed persisted fields', () => {
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ subject: 's'.repeat(200), message: 42, company: {} }));
    expect(loadContactDraft()).toEqual({ subject: 's'.repeat(150) });
    sessionStorage.setItem(CONTACT_DRAFT_KEY, '[]');
    expect(loadContactDraft()).toBeNull();
  });

  it('does not clear an independently replaced or newly saved draft', () => {
    saveContactDraft({ subject: 'Sent' });
    const snapshot = captureContactDraft();
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ subject: 'New' }));
    expect(clearContactDraft(snapshot)).toBe(false);
    expect(loadContactDraft()).toEqual({ subject: 'New' });
    const sameContent = captureContactDraft();
    saveContactDraft({ subject: 'New' });
    expect(clearContactDraft(sameContent)).toBe(false);
    expect(clearContactDraft(captureContactDraft())).toBe(true);
    expect(loadContactDraft()).toBeNull();
  });

  it('clears drafts', () => {
    saveContactDraft({ subject: 'x' });
    clearContactDraft();
    expect(loadContactDraft()).toBeNull();
  });
});
