import { describe, it, expect, beforeEach } from 'vitest';

import {
  CONTACT_DRAFT_KEY,
  captureContactDraft,
  normalizeContactDraft,
  saveContactDraft,
  loadContactDraft,
  clearContactDraft,
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

  it('clears drafts', () => {
    saveContactDraft({ subject: 'x' });
    clearContactDraft();
    expect(loadContactDraft()).toBeNull();
  });

  it.each([150, 151, 200])('caps saved and legacy loaded subjects of length %s at 150', length => {
    const subject = 'x'.repeat(length);
    saveContactDraft({ subject });
    expect(loadContactDraft()?.subject).toBe('x'.repeat(150));
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ subject }));
    expect(loadContactDraft()?.subject).toBe('x'.repeat(150));
  });

  it('normalizes incoming subjects without changing existing email/message caps', () => {
    const email = 'e'.repeat(220);
    const message = 'm'.repeat(4500);
    expect(normalizeContactDraft({ from_email: email, subject: 's'.repeat(200), message }))
      .toEqual({ from_email: email, subject: 's'.repeat(150), message });
    saveContactDraft({ from_email: email, message });
    expect(loadContactDraft()).toEqual({ from_email: 'e'.repeat(200), message: 'm'.repeat(4000) });
  });

  it('clears only an unchanged captured draft', () => {
    saveContactDraft({ subject: 'A' });
    expect(clearContactDraft(captureContactDraft())).toBe(true);
    expect(loadContactDraft()).toBeNull();
  });

  it('keeps a later save even with identical serialized content', () => {
    saveContactDraft({ subject: 'A' });
    const snapshot = captureContactDraft();
    saveContactDraft({ subject: 'A' });
    expect(clearContactDraft(snapshot)).toBe(false);
    expect(loadContactDraft()?.subject).toBe('A');
  });

  it('keeps storage changed independently of the helper', () => {
    saveContactDraft({ subject: 'A' });
    const snapshot = captureContactDraft();
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ subject: 'B' }));
    expect(clearContactDraft(snapshot)).toBe(false);
    expect(loadContactDraft()?.subject).toBe('B');
  });

  it('fails closed without a readable snapshot and ignores invalid stored shapes', () => {
    saveContactDraft({ subject: 'A' });
    expect(clearContactDraft(null)).toBe(false);
    expect(loadContactDraft()?.subject).toBe('A');
    sessionStorage.setItem(CONTACT_DRAFT_KEY, '[]');
    expect(loadContactDraft()).toBeNull();
    sessionStorage.setItem(CONTACT_DRAFT_KEY, '{"subject":42}');
    expect(loadContactDraft()).toEqual({});
  });
});
