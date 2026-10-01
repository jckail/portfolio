import { TRACKABLE_ANCHORS } from '../utils/analytics-anchors';
import { flush, track } from './core';
import { lengthBucket, scrubMessage, slugify } from './events';

/**
 * DOM-level instrumentation, attached by one `startTracker()` call and fully
 * detached by the returned stop function. It observes the page instead of
 * editing components: dialogs by role, links and forms by delegation,
 * scrolling, performance entries and window errors.
 *
 * Callers start it only while analytics consent is granted and stop it the
 * moment consent is withdrawn.
 */

// The URL the visitor arrived on, read once at import: the app rewrites the
// query/hash as it opens deep-linked modals, so reading it later would miss it.
const ARRIVAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
const ARRIVAL_HASH = typeof window !== 'undefined' ? window.location.hash : '';
let deepLinkReported = false;

const DEEP_LINK_PARAMS = ['skill', 'project', 'company'] as const;

/** Exposed for tests. */
export function reportDeepLinks(search = ARRIVAL_SEARCH, hash = ARRIVAL_HASH): void {
  const params = new URLSearchParams(search);
  for (const name of DEEP_LINK_PARAMS) {
    const value = params.get(name);
    if (value !== null) track('deep_link_open', { param: name, [name]: value.toLowerCase() });
  }
  if (params.get('ai_chat') === 'open') track('deep_link_open', { param: 'ai_chat' });
  if (params.get('party') === '1') track('deep_link_open', { param: 'party' });
  const theme = params.get('theme');
  if (theme !== null) track('deep_link_open', { param: 'theme', theme });
  const anchor = hash.replace(/^#/, '');
  if (TRACKABLE_ANCHORS.has(anchor)) track('deep_link_open', { param: 'hash', section: anchor });
}

type DialogKind = 'experience' | 'project' | 'skill' | 'contact' | 'palette' | 'chat' | 'other';

function dialogKind(el: Element): DialogKind {
  const cls = el.className && typeof el.className === 'string' ? el.className : '';
  if (el.closest('.MuiDialog-root')) return 'chat';
  if (cls.includes('command-palette')) return 'palette';
  if (cls.includes('contact-modal')) return 'contact';
  if (cls.includes('project-modal')) return 'project';
  if (cls.includes('experience-modal')) return 'experience';
  if (cls.includes('skill-modal')) return 'skill';
  return 'other';
}

/** The visible title of a dialog (a public company, project or skill name). */
function dialogTitle(el: Element): string {
  const id = el.getAttribute('aria-labelledby');
  const heading = id ? document.getElementById(id) : null;
  return heading?.textContent ?? el.getAttribute('aria-label') ?? '';
}

const KEYED_KINDS: Partial<Record<DialogKind, 'company' | 'project' | 'skill'>> = {
  experience: 'company',
  project: 'project',
  skill: 'skill',
};

interface OpenDialog {
  kind: DialogKind;
  key: Record<string, string>;
  openedAt: number;
}

function observeDialogs(): () => void {
  const open = new Map<Element, OpenDialog>();

  const consider = (node: Node) => {
    if (!(node instanceof Element)) return;
    const found: Element[] = [];
    if (node.matches('[role="dialog"]')) found.push(node);
    node.querySelectorAll('[role="dialog"]').forEach(el => found.push(el));
    for (const el of found) {
      if (open.has(el)) continue;
      const kind = dialogKind(el);
      const keyName = KEYED_KINDS[kind];
      const title = keyName ? slugify(dialogTitle(el)) : '';
      const key = keyName && title ? { [keyName]: title } : {};
      open.set(el, { kind, key, openedAt: Date.now() });
      track('modal_open', { kind, ...key });
      if (kind === 'chat') track('chat_open');
      if (kind === 'contact') track('contact_open');
    }
  };

  const sweepClosed = () => {
    for (const [el, info] of open) {
      if (el.isConnected) continue;
      open.delete(el);
      track('modal_close', {
        kind: info.kind,
        ...info.key,
        duration_ms: Date.now() - info.openedAt,
      });
    }
  };

  // Dialogs already open when tracking starts (consent given on the banner
  // while one is up) are picked up too.
  consider(document.body);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(consider);
    }
    if (open.size > 0) sweepClosed();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  // Generic hook for components: <button data-track-event="chat_action_confirmed" data-track-tool="contact_jordan">
  const marked = target.closest<HTMLElement>('[data-track-event]');
  if (marked) {
    const name = marked.dataset.trackEvent;
    if (name === 'chat_action_confirmed' || name === 'chat_action_cancelled') {
      track(name, { tool: marked.dataset.trackTool });
    }
  }

  if (target.closest('button[aria-label="Preview resume PDF"]')) {
    track('resume_preview', { source: 'inline' });
  }

  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  if (!anchor) return;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return;
  }
  if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
    // Never the address or number: only that the link kind was used.
    track('outbound_click', { host: url.protocol.slice(0, -1) });
  } else if (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.host !== window.location.host
  ) {
    track('outbound_click', { host: url.hostname.toLowerCase() });
  }
}

function onSubmit(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  // The phone-reveal form. Only the fact of the request; the email field is
  // never read.
  if (target.matches('form[aria-label="Request phone number"]')) {
    track('phone_reveal_requested');
  }
}

const SEARCH_IDLE_MS = 1000;
const searchTimers = new Map<Element, ReturnType<typeof setTimeout>>();

function onInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'search') return;
  const existing = searchTimers.get(target);
  if (existing) clearTimeout(existing);
  searchTimers.set(
    target,
    setTimeout(() => {
      searchTimers.delete(target);
      if (target.value.length === 0) return;
      track('search_used', {
        source: target.closest('.command-palette') ? 'palette' : 'skills',
        // The query itself is never read beyond its length.
        len: lengthBucket(target.value.length),
      });
    }, SEARCH_IDLE_MS)
  );
}

function observeScrollDepth(): () => void {
  const thresholds = [25, 50, 75, 100];
  const reached = new Set<number>();
  let frame = 0;

  const measure = () => {
    frame = 0;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const pct = Math.min(100, ((window.scrollY || doc.scrollTop) / scrollable) * 100);
    for (const t of thresholds) {
      if (pct >= t - 0.5 && !reached.has(t)) {
        reached.add(t);
        track('scroll_depth', { depth: String(t) });
      }
    }
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}

type Rating = 'good' | 'needs-improvement' | 'poor';
const rate = (value: number, good: number, poor: number): Rating =>
  value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}
interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
}

let vitalsReported = false;

function observeWebVitals(): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};
  const observers: PerformanceObserver[] = [];
  const observe = (type: string, cb: (entries: PerformanceEntryList) => void, extra = {}) => {
    try {
      const po = new PerformanceObserver(list => cb(list.getEntries()));
      po.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
      observers.push(po);
    } catch {
      // entry type unsupported in this browser
    }
  };

  let lcp = 0;
  observe('largest-contentful-paint', entries => {
    const last = entries[entries.length - 1];
    if (last) lcp = last.startTime;
  });

  // CLS: largest session window (gap < 1s, window <= 5s), as web-vitals does.
  let cls = 0;
  let windowValue = 0;
  let windowStart = 0;
  let windowLast = 0;
  observe('layout-shift', entries => {
    for (const e of entries as LayoutShiftEntry[]) {
      if (e.hadRecentInput) continue;
      if (windowValue && (e.startTime - windowLast > 1000 || e.startTime - windowStart > 5000)) {
        windowValue = 0;
      }
      if (!windowValue) windowStart = e.startTime;
      windowValue += e.value;
      windowLast = e.startTime;
      cls = Math.max(cls, windowValue);
    }
  });

  // INP: the slowest interaction (the 98th percentile is the same for the
  // < 50 interactions a portfolio visit has).
  const interactions = new Map<number, number>();
  observe(
    'event',
    entries => {
      for (const e of entries as EventTimingEntry[]) {
        if (!e.interactionId) continue;
        interactions.set(e.interactionId, Math.max(interactions.get(e.interactionId) ?? 0, e.duration));
      }
    },
    { durationThreshold: 40 }
  );

  const report = () => {
    if (vitalsReported) return;
    vitalsReported = true;
    if (lcp > 0) track('web_vital', { metric: 'LCP', value: Math.round(lcp), rating: rate(lcp, 2500, 4000) });
    track('web_vital', { metric: 'CLS', value: Math.round(cls * 1000) / 1000, rating: rate(cls, 0.1, 0.25) });
    if (interactions.size > 0) {
      const inp = Math.max(...interactions.values());
      track('web_vital', { metric: 'INP', value: Math.round(inp), rating: rate(inp, 200, 500) });
    }
    flush();
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') {
      report();
      flush();
    }
  };
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', report);

  return () => {
    observers.forEach(o => o.disconnect());
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('pagehide', report);
  };
}

const MAX_ERRORS_PER_PAGE = 5;

function observeErrors(): () => void {
  const seen = new Set<string>();
  const report = (type: 'error' | 'unhandledrejection', raw: unknown, line?: number) => {
    if (seen.size >= MAX_ERRORS_PER_PAGE) return;
    const text = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '';
    const message = scrubMessage(text || type);
    const key = `${type}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    // No stack, no file URL: those carry paths and query strings.
    track('client_error', { type, message, ...(line ? { line } : {}) }, { ga: true });
  };
  const onError = (e: ErrorEvent) => report('error', e.error ?? e.message, e.lineno);
  const onRejection = (e: PromiseRejectionEvent) => report('unhandledrejection', e.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/** Attach every observer. Returns the function that detaches them all. */
export function startTracker(): () => void {
  if (!deepLinkReported) {
    deepLinkReported = true;
    reportDeepLinks();
  }

  const stops = [
    observeDialogs(),
    observeScrollDepth(),
    observeWebVitals(),
    observeErrors(),
  ];
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('input', onInput, true);

  return () => {
    stops.forEach(stop => stop());
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('submit', onSubmit, true);
    document.removeEventListener('input', onInput, true);
    searchTimers.forEach(t => clearTimeout(t));
    searchTimers.clear();
  };
}

/** Test hook. */
export function resetTrackerForTests(): void {
  deepLinkReported = false;
  vitalsReported = false;
}
