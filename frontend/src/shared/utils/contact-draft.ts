/**
 * Shared contact-form draft so the AI assistant (or other UI) can prefill
 * the contact modal without prop-drilling through the whole tree.
 */

export const CONTACT_DRAFT_EVENT = 'portfolio:contact-draft';
export const CONTACT_DRAFT_KEY = 'portfolio_contact_draft_v1';

export interface ContactDraft {
  from_email?: string;
  subject?: string;
  message?: string;
}

export function saveContactDraft(draft: ContactDraft): void {
  const cleaned: ContactDraft = {};
  if (draft.from_email?.trim()) cleaned.from_email = draft.from_email.trim().slice(0, 200);
  if (draft.subject?.trim()) cleaned.subject = draft.subject.trim().slice(0, 200);
  if (draft.message?.trim()) cleaned.message = draft.message.trim().slice(0, 4000);
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
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearContactDraft(): void {
  try {
    sessionStorage.removeItem(CONTACT_DRAFT_KEY);
  } catch {
    // ignore
  }
}
