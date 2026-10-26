/**
 * Shared contact-form draft so the AI assistant (or other UI) can prefill
 * the contact modal without prop-drilling through the whole tree.
 */

export const CONTACT_DRAFT_EVENT = 'portfolio:contact-draft';
export const CONTACT_DRAFT_KEY = 'portfolio_contact_draft_v1';
export const CONTACT_SUBJECT_LIMIT = 150;
let draftRevision = 0;

export interface ContactDraftSnapshot {
  readonly raw: string | null;
  readonly revision: number;
}

export interface ContactDraft {
  from_email?: string;
  company?: string;
  subject?: string;
  message?: string;
}

export function normalizeContactDraft(draft: unknown): ContactDraft | null {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null;
  const values = draft as Record<string, unknown>;
  const cleaned: ContactDraft = {};
  for (const [field, limit] of Object.entries({ from_email: 254, company: 150, subject: CONTACT_SUBJECT_LIMIT, message: 5000 })) {
    const value = values[field];
    if (typeof value === 'string') cleaned[field as keyof ContactDraft] = value.slice(0, limit);
  }
  return cleaned;
}

export function saveContactDraft(draft: ContactDraft): void {
  const cleaned: ContactDraft = {};
  for (const [field, value] of Object.entries(normalizeContactDraft(draft) ?? {})) {
    if (value.trim()) cleaned[field as keyof ContactDraft] = value.trim();
  }
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
    return normalizeContactDraft(JSON.parse(raw));
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

// A send may only clear the exact draft it observed; later saves are new intent.
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
