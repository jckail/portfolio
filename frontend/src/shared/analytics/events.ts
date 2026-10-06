import { TRACKABLE_ANCHORS } from '../utils/analytics-anchors';
import { isTheme } from '../../types/theme';

/**
 * Legacy event contract retained for backend compatibility and pure validators.
 * The SPA no longer sends these events.
 */
export const EVENT_NAMES = [
  'section_view',
  'deep_link_open',
  'modal_open',
  'modal_close',
  'outbound_click',
  'resume_preview',
  'resume_download',
  'contact_open',
  'phone_reveal_requested',
  'chat_open',
  'chat_message_sent',
  'chat_action_confirmed',
  'chat_action_cancelled',
  'theme_change',
  'party_mode',
  'search_used',
  'scroll_depth',
  'web_vital',
  'client_error',
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];

export type EventProps = Record<string, string | number>;

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === 'string' && (EVENT_NAMES as readonly string[]).includes(value);
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const HOST_RE = /^[a-z0-9]([a-z0-9.-]{0,98}[a-z0-9])?$/;

/** Lowercase, hyphenate and cap a public label (company, project, skill name). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** Length buckets: the only form in which typed text is ever reported. */
export function lengthBucket(length: number): string {
  if (!Number.isFinite(length) || length <= 0) return '0';
  if (length <= 10) return '1-10';
  if (length <= 50) return '11-50';
  if (length <= 200) return '51-200';
  return '201+';
}

/** Strip anything identifying out of an error message and cap it. */
export function scrubMessage(raw: string): string {
  return raw
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[url]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, '[id]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

const slug = (v: unknown): string | null =>
  typeof v === 'string' && SLUG_RE.test(v) ? v : null;
const oneOf =
  (...allowed: string[]) =>
  (v: unknown): string | null =>
    typeof v === 'string' && allowed.includes(v) ? v : null;
const num =
  (min: number, max: number) =>
  (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
      ? Math.round(v * 1000) / 1000
      : null;

type Validator = (v: unknown) => string | number | null;

/**
 * Allowlist of prop keys and what each may hold. Anything else (unknown keys,
 * free text, over-long values) is dropped, so a call site cannot leak an
 * email or message body by accident.
 */
const PROP_VALIDATORS: Record<string, Validator> = {
  section: v => (typeof v === 'string' && TRACKABLE_ANCHORS.has(v) ? v : null),
  project: slug,
  skill: slug,
  company: slug,
  theme: v => (isTheme(v) ? v : null),
  from: v => (isTheme(v) ? v : null),
  kind: oneOf('experience', 'project', 'skill', 'contact', 'palette', 'chat', 'other'),
  param: oneOf('skill', 'project', 'company', 'ai_chat', 'party', 'theme', 'hash'),
  host: v => (typeof v === 'string' && HOST_RE.test(v) ? v : null),
  source: slug,
  tool: slug,
  len: oneOf('0', '1-10', '11-50', '51-200', '201+'),
  depth: oneOf('25', '50', '75', '100'),
  metric: oneOf('LCP', 'CLS', 'INP'),
  rating: oneOf('good', 'needs-improvement', 'poor'),
  value: num(0, 1_000_000),
  duration_ms: num(0, 86_400_000),
  type: oneOf('error', 'unhandledrejection'),
  message: v => (typeof v === 'string' ? scrubMessage(v) || null : null),
  line: num(0, 10_000_000),
};

/** Returns only the allowlisted, validated props. */
export function sanitizeProps(props: Record<string, unknown> | undefined): EventProps {
  const out: EventProps = {};
  if (!props) return out;
  for (const key of Object.keys(props)) {
    if (!Object.prototype.hasOwnProperty.call(PROP_VALIDATORS, key)) continue;
    const cleaned = PROP_VALIDATORS[key](props[key]);
    if (cleaned !== null) out[key] = cleaned;
  }
  return out;
}
