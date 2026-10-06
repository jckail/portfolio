import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  getSessionId,
  trackPageView,
  trackAnchorChange,
  trackSectionView,
  trackChatOpen,
} from './analytics';
import { COOKIE_CONSENT_KEY } from './cookie-consent';

describe('analytics', () => {
  it('does not poll or call gtag when a prior accept is stored', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const fresh = await import('./analytics');
    const polling = vi.spyOn(globalThis, 'setInterval');
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      window.gtag = vi.fn();
      const pending = fresh.trackPageView('/');
      await vi.advanceTimersByTimeAsync(6000);
      await pending;
      await fresh.initializeAnalytics();
      await fresh.trackModalView('demo', 'project', 'Demo');
      expect(polling).not.toHaveBeenCalled();
      expect(window.gtag).not.toHaveBeenCalled();
    } finally {
      polling.mockRestore();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    window.history.replaceState({}, '', '/');
    window.gtag = vi.fn();
  });

  describe('getSessionId', () => {
    it('generates a session id and persists it for the session', () => {
      const first = getSessionId();
      expect(first).toMatch(/^sid_/);
      expect(getSessionId()).toBe(first);
    });

    it('generates a new id when session storage is cleared', () => {
      const first = getSessionId();
      sessionStorage.clear();
      expect(getSessionId()).not.toBe(first);
    });
  });

  describe('trackPageView', () => {
    it('sends no page_view when a prior accept is stored', async () => {
      await trackPageView('/');
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('sends no page_view for a hashed path', async () => {
      window.history.replaceState({}, '', '/#about');
      await trackPageView('/');
      await trackPageView('/#about');
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('skips events when cookie consent is denied', async () => {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'denied');
      await trackPageView('/');
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('does not throw when gtag is unavailable', async () => {
      // @ts-expect-error simulating gtag not loaded
      window.gtag = undefined;
      // waitForGtag polls, so advance fake timers past its 5s timeout
      vi.useFakeTimers();
      const pending = trackPageView('/');
      await vi.advanceTimersByTimeAsync(6000);
      await expect(pending).resolves.toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe('page_view double-counting', () => {
    // trackAnchorChange and trackSectionView are always called together
    // for the same section transition (see useScrollSpy); only one of
    // them should ever send a page_view, or GA4 pageview counts get
    // inflated ~2x for every scroll-driven section change.

    it('a section transition sends no page_view', async () => {
      await trackAnchorChange('projects', 'about');
      await trackSectionView('projects');
      expect(window.gtag).not.toHaveBeenCalled();
    });
  });

  describe('consent gating of the session id', () => {
    it('does not create a session id for a prior accept or a denial', async () => {
      await trackChatOpen();
      expect(sessionStorage.getItem('ga_session_id')).toBeNull();
      localStorage.setItem(COOKIE_CONSENT_KEY, 'denied');
      await trackChatOpen();
      expect(sessionStorage.getItem('ga_session_id')).toBeNull();
      expect(window.gtag).not.toHaveBeenCalled();
    });
  });

  describe('anchor allowlist', () => {
    // URL fragments are attacker-controlled; only known section ids may
    // reach GA, so a crafted link cannot plant arbitrary strings (or PII)
    // in reports.
    const calls = () => (window.gtag as ReturnType<typeof vi.fn>).mock.calls;

    it('does not send an unknown anchor', async () => {
      window.history.replaceState({}, '', '/#someone@example.com');
      await trackPageView('/');
      await trackPageView('/#evil-payload');
      expect(window.gtag).not.toHaveBeenCalled();
      expect(JSON.stringify(calls())).not.toContain('example.com');
    });

    it('skips anchor_change for an unknown anchor', async () => {
      await trackAnchorChange('someone@example.com', 'about');
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('does not send an anchor change', async () => {
      await trackAnchorChange('projects', 'junk-value');
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('skips section_view for an unknown section', async () => {
      await trackSectionView('not-a-section');
      expect(window.gtag).not.toHaveBeenCalled();
    });
  });
});
