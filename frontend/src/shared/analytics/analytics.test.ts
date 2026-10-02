import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { setCookieConsent } from '../utils/cookie-consent';
import { trackThemeChange, trackChatMessage, trackSectionView } from '../utils/analytics';
import { flush, resetForTests, track } from './core';
import { lengthBucket, sanitizeProps, scrubMessage, slugify } from './events';
import { reportDeepLinks, resetTrackerForTests, startTracker } from './tracker';

const beacon = vi.fn((_url: string, _body?: BodyInit | null) => true);

function sent(): { event: string; props: Record<string, unknown> }[] {
  return beacon.mock.calls.map(call => {
    const blob = call[1] as Blob;
    // Blob text is async in jsdom; the tests stash the raw string instead.
    return JSON.parse((blob as unknown as { __body: string }).__body);
  });
}

class FakeBlob {
  __body: string;
  constructor(parts: string[]) {
    this.__body = parts.join('');
  }
}

// jsdom cannot navigate; the tracker has already seen the click by now.
const noNav = (e: Event) => e.preventDefault();

describe('product analytics', () => {
  beforeEach(() => {
    document.addEventListener('click', noNav);
    localStorage.clear();
    resetForTests();
    resetTrackerForTests();
    beacon.mockClear();
    vi.stubGlobal('Blob', FakeBlob);
    vi.stubGlobal('gtag', vi.fn());
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.removeEventListener('click', noNav);
  });

  it('sends nothing before consent', () => {
    track('chat_open');
    void trackThemeChange('dark', 'light');
    void trackSectionView('about');
    flush();
    vi.advanceTimersByTime(10_000);
    expect(beacon).not.toHaveBeenCalled();
  });

  it('batches after consent and flushes on the timer', () => {
    setCookieConsent('accepted');
    track('chat_open');
    expect(beacon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3500);
    expect(sent()).toEqual([{ event: 'chat_open', props: {} }]);
    expect(beacon.mock.calls[0][0]).toBe('/api/events');
  });

  it('drops queued events when consent is withdrawn', () => {
    setCookieConsent('accepted');
    track('chat_open');
    setCookieConsent('denied');
    vi.advanceTimersByTime(10_000);
    flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('collapses an immediate duplicate', () => {
    setCookieConsent('accepted');
    track('chat_open');
    track('chat_open');
    flush();
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('routes legacy helpers without free text', async () => {
    setCookieConsent('accepted');
    await trackChatMessage('sent', 120);
    await trackThemeChange('party', 'dark');
    flush();
    const events = sent();
    expect(events).toContainEqual({ event: 'chat_message_sent', props: { len: '51-200' } });
    expect(events.map(e => e.event)).toEqual(
      expect.arrayContaining(['theme_change', 'party_mode'])
    );
  });

  it('allowlists and bounds props', () => {
    expect(
      sanitizeProps({
        section: 'about',
        project: 'x'.repeat(80),
        skill: 'Python',
        email: 'a@b.co',
        message: 'mail me at jane@example.com or +1 (555) 123-4567',
        depth: '50',
        host: 'bad host',
        __proto__: { section: 'about' },
      })
    ).toEqual({ section: 'about', message: 'mail me at [email] or [number]', depth: '50' });
    expect(sanitizeProps({ constructor: 'x', toString: 'y' })).toEqual({});
  });

  it('scrubs and buckets', () => {
    expect(scrubMessage('fail https://x.test/?t=abc a@b.io')).toBe('fail [url] [email]');
    expect(scrubMessage('y'.repeat(500)).length).toBeLessThanOrEqual(120);
    expect(lengthBucket(0)).toBe('0');
    expect(lengthBucket(11)).toBe('11-50');
    expect(lengthBucket(5000)).toBe('201+');
    expect(slugify('Together AI')).toBe('together-ai');
  });

  it('reports deep links from the arrival URL', () => {
    setCookieConsent('accepted');
    reportDeepLinks('?skill=Python&ai_chat=open&theme=dark', '#projects');
    flush();
    const events = sent();
    expect(events).toContainEqual({ event: 'deep_link_open', props: { param: 'skill', skill: 'python' } });
    expect(events).toContainEqual({ event: 'deep_link_open', props: { param: 'ai_chat' } });
    expect(events).toContainEqual({ event: 'deep_link_open', props: { param: 'hash', section: 'projects' } });
  });

  it('observes dialogs, outbound links and phone form; stops cleanly', () => {
    setCookieConsent('accepted');
    const stop = startTracker();

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.className = 'experience-modal-content';
    dialog.setAttribute('aria-labelledby', 'h');
    dialog.innerHTML = '<h2 id="h">Together AI</h2>';
    document.body.appendChild(dialog);

    const link = document.createElement('a');
    link.href = 'https://github.com/jckail/portfolio?secret=1';
    document.body.appendChild(link);
    const mail = document.createElement('a');
    mail.href = 'mailto:someone@example.com';
    document.body.appendChild(mail);
    const form = document.createElement('form');
    form.setAttribute('aria-label', 'Request phone number');
    document.body.appendChild(form);

    return Promise.resolve().then(async () => {
      await new Promise(r => queueMicrotask(() => r(null)));
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      mail.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true }));
      dialog.remove();
      await new Promise(r => queueMicrotask(() => r(null)));
      flush();
      const events = sent();
      const names = events.map(e => e.event);
      expect(names).toEqual(
        expect.arrayContaining(['modal_open', 'outbound_click', 'phone_reveal_requested', 'modal_close'])
      );
      expect(events).toContainEqual({ event: 'modal_open', props: { kind: 'experience', company: 'together-ai' } });
      expect(events).toContainEqual({ event: 'outbound_click', props: { host: 'github.com' } });
      expect(events).toContainEqual({ event: 'outbound_click', props: { host: 'mailto' } });
      expect(JSON.stringify(events)).not.toContain('example.com');
      expect(JSON.stringify(events)).not.toContain('secret');

      stop();
      beacon.mockClear();
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      flush();
      expect(beacon).not.toHaveBeenCalled();
    });
  });

  it('reports client errors scrubbed and bounded', () => {
    setCookieConsent('accepted');
    const stop = startTracker();
    for (let i = 0; i < 9; i += 1) {
      window.dispatchEvent(new ErrorEvent('error', { error: new Error(`boom ${i} user@example.com`) }));
    }
    flush();
    const errors = sent().filter(e => e.event === 'client_error');
    expect(errors.length).toBe(5);
    expect(JSON.stringify(errors)).not.toContain('user@example.com');
    stop();
  });
});
