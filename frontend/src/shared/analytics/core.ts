import { getCookieConsent, hasAnalyticsConsent, CONSENT_CHANGE_EVENT } from '../utils/cookie-consent';
import { postJson } from '../utils/api/client';
import { endpoints } from '../utils/api/endpoints';
import { isAnalyticsEvent, sanitizeProps, type AnalyticsEvent, type EventProps } from './events';

/**
 * Typed product-analytics core: one `track()` feeds
 *  (a) the first-party POST /api/events (batched, beacon, failure-silent), and
 *  (b) GA4 through the existing gtag path, for events GA does not already get
 *      from the legacy `track*` helpers in utils/analytics.ts.
 *
 * Nothing is queued, sent or mirrored unless the visitor has accepted
 * analytics, and withdrawing consent empties the queue immediately.
 */

interface QueuedEvent {
  event: AnalyticsEvent;
  props: EventProps;
}

const MAX_QUEUE = 25;
const FLUSH_SIZE = 8;
const FLUSH_DELAY_MS = 3000;
/** Hard ceiling per page load so a loop in the page can't flood the endpoint. */
const MAX_EVENTS_PER_PAGE = 200;
/** Identical event+props inside this window are one event (double-fire guard). */
const DEDUPE_MS = 400;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sentThisPage = 0;
const recent = new Map<string, number>();

export interface TrackOptions {
  /**
   * Also send to GA4. Off for events the legacy helpers already send to GA
   * (section_view, theme_change, ...), which would otherwise double count.
   */
  ga?: boolean;
}

function sendGa(event: AnalyticsEvent, props: EventProps): void {
  try {
    if (typeof window.gtag !== 'function' || !hasAnalyticsConsent()) return;
    let sid = '';
    try {
      sid = sessionStorage.getItem('ga_session_id') ?? '';
    } catch {
      // storage blocked
    }
    window.gtag('event', event, { ...props, ...(sid && { session_id: sid }) });
  } catch {
    // analytics must never break the page
  }
}

function postEvent(item: QueuedEvent): void {
  const body = JSON.stringify(item);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(endpoints.events, blob)) return;
    }
  } catch {
    // fall through to fetch
  }
  postJson(endpoints.events, item, { keepalive: true }).catch(() => {});
}

/** Send everything queued now. No-op without consent. */
export function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue;
  queue = [];
  if (batch.length === 0 || !hasAnalyticsConsent()) return;
  for (const item of batch) postEvent(item);
}

/** Drop pending events and timers (consent withdrawn or denied). */
export function reset(): void {
  queue = [];
  recent.clear();
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Record one product event. Props are allowlisted and bounded. */
export function track(
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
  options: TrackOptions = {}
): void {
  try {
    if (!hasAnalyticsConsent() || !isAnalyticsEvent(event)) return;
    if (sentThisPage >= MAX_EVENTS_PER_PAGE) return;

    const clean = sanitizeProps(props);
    const key = `${event}|${JSON.stringify(clean)}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUPE_MS) return;
    recent.set(key, now);
    if (recent.size > 100) recent.clear();

    sentThisPage += 1;
    if (options.ga) sendGa(event, clean);

    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({ event, props: clean });
    if (queue.length >= FLUSH_SIZE) {
      flush();
    } else if (!timer) {
      timer = setTimeout(flush, FLUSH_DELAY_MS);
    }
  } catch {
    // analytics must never break the page
  }
}

/** Test hook: forget page-level counters. */
export function resetForTests(): void {
  reset();
  sentThisPage = 0;
}

// Withdrawal or denial empties the queue at once. (The tracker also stops its
// observers on the same signal; this keeps the queue safe even if it is not
// mounted.)
if (typeof window !== 'undefined') {
  const onChange = () => {
    if (getCookieConsent() !== 'accepted') reset();
  };
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
}
