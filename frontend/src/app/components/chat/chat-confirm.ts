import type { ConfirmArgs, ConfirmTool } from '../../../types/chat';

/** Same caps the REST endpoints enforce; the server re-validates regardless. */
export const EMAIL_MAX = 254;
export const SUBJECT_MAX = 150;
export const MESSAGE_MAX = 5000;
export const TOPIC_MAX = 200;
export const TIMES_MAX = 500;

/** Server-side pending actions live ten minutes. */
export const CONFIRM_TTL_MS = 10 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONFIRM_TOOLS: readonly ConfirmTool[] = [
  'contact_jordan',
  'request_phone',
  'request_meeting',
  'book_meeting',
];

export function isConfirmTool(tool: unknown): tool is ConfirmTool {
  return typeof tool === 'string' && (CONFIRM_TOOLS as readonly string[]).includes(tool);
}

/** Returns an error message, or null when the address looks valid. */
export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email so Jordan can reply.';
  if (email.length > EMAIL_MAX) return 'That email address is too long.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

/** Errors per editable field; empty object means the args can be sent. */
export function validateArgs(tool: ConfirmTool, args: ConfirmArgs): Record<string, string> {
  const errors: Record<string, string> = {};
  if (tool === 'contact_jordan') {
    if (!args.subject?.trim()) errors.subject = 'Add a subject.';
    else if (args.subject.length > SUBJECT_MAX) errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
    if (!args.message?.trim()) errors.message = 'Add a message.';
    else if (args.message.length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters.`;
  }
  if ((tool === 'request_meeting' || tool === 'book_meeting')) {
    if (!args.topic?.trim()) errors.topic = 'Add a topic.';
    else if (args.topic.length > TOPIC_MAX) errors.topic = `Keep the topic under ${TOPIC_MAX} characters.`;
    if ((args.preferred_times ?? '').length > TIMES_MAX) {
      errors.preferred_times = `Keep this under ${TIMES_MAX} characters.`;
    }
  }
  if (tool === 'book_meeting') {
    if (!args.start || !/T/.test(args.start) || !Number.isFinite(Date.parse(args.start))) errors.start = 'Ask the assistant for an available slot again.';
    if (!args.company?.trim()) errors.company = 'Add your company or organization.';
    else if (args.company.length > 120) errors.company = 'Keep the company under 120 characters.';
  }
  return errors;
}

/** Only an actual string survives from the untrusted frame. */
function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function sanitizeArgs(raw: unknown): ConfirmArgs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: ConfirmArgs = {};
  const subject = str(o.subject);
  const message = str(o.message);
  const topic = str(o.topic);
  const times = str(o.preferred_times);
  if (subject !== undefined) out.subject = subject.slice(0, SUBJECT_MAX);
  if (message !== undefined) out.message = message.slice(0, MESSAGE_MAX);
  if (topic !== undefined) out.topic = topic.slice(0, TOPIC_MAX);
  if (times !== undefined) out.preferred_times = times.slice(0, TIMES_MAX);
  const start = str(o.start);
  const company = str(o.company);
  if (start !== undefined) out.start = start.slice(0, 40);
  if (company !== undefined) out.company = company.slice(0, 120);
  return out;
}

/** Keep only characters valid in a tel: href. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
