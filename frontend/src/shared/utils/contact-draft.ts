/**
 * Shared contact-form draft so the AI assistant (or other UI) can prefill
 * the contact modal without prop-drilling through the whole tree.
 */

export const CONTACT_DRAFT_EVENT = 'portfolio:contact-draft';
export const CONTACT_DRAFT_KEY = 'portfolio_contact_draft_v1';
export const CONTACT_SUBJECT_LIMIT = 150;

// A later save is new intent even when its serialized content is identical.
let draftRevision = 0;

export interface ContactDraftSnapshot {
  readonly raw: string | null;
  readonly revision: number;
}

export interface ContactDraft {
  from_email?: string;
  subject?: string;
  message?: string;
}

export function normalizeContactDraft(draft: ContactDraft | null): ContactDraft | null {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null;
  const normalized: ContactDraft = {};
  if (typeof draft.from_email === 'string') normalized.from_email = draft.from_email;
  if (typeof draft.subject === 'string') normalized.subject = draft.subject.slice(0, CONTACT_SUBJECT_LIMIT);
  if (typeof draft.message === 'string') normalized.message = draft.message;
  return normalized;
}

export function saveContactDraft(draft: ContactDraft): void {
  const cleaned: ContactDraft = {};
  if (draft.from_email?.trim()) cleaned.from_email = draft.from_email.trim().slice(0, 200);
  if (draft.subject?.trim()) cleaned.subject = draft.subject.trim().slice(0, CONTACT_SUBJECT_LIMIT);
  if (draft.message?.trim()) cleaned.message = draft.message.trim().slice(0, 4000);
  draftRevision += 1;
  try {
    sessionStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent(CONTACT_DRAFT_EVENT, { detail: cleaned })
  );
}

export function loadContactDraft(): ContactDraft | null {
  try {
    const raw = sessionStorage.getItem(CONTACT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContactDraft;
    return normalizeContactDraft(parsed);
  } catch {
    return null;
  }
}

export function captureContactDraft(): ContactDraftSnapshot | null {
  try {
    return { raw: sessionStorage.getItem(CONTACT_DRAFT_KEY), revision: draftRevision };
  } catch {
    return null;
  }
}

// No argument retains the existing unconditional-clear API. A submitted draft
// may only clear the exact storage snapshot it observed, never a later save.
export function clearContactDraft(expected?: ContactDraftSnapshot | null): boolean {
  try {
    if (expected !== undefined && (
      expected === null || expected.revision !== draftRevision ||
      expected.raw !== sessionStorage.getItem(CONTACT_DRAFT_KEY)
    )) return false;
    sessionStorage.removeItem(CONTACT_DRAFT_KEY);
    draftRevision += 1;
    return true;
  } catch {
    return false;
  }
}
