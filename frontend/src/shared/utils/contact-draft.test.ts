import { describe, it, expect, beforeEach } from 'vitest';

import {
  CONTACT_DRAFT_KEY,
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
});
