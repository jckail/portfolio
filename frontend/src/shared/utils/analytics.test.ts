import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getSessionId, trackPageView, trackAnchorChange, trackSectionView } from './analytics';
import { COOKIE_CONSENT_KEY } from './cookie-consent';

describe('analytics', () => {
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
    it('sends a page_view event with the given path', async () => {
      await trackPageView('/');
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({ page_path: '/' })
      );
    });

    it('appends the current hash when the path has none', async () => {
      window.history.replaceState({}, '', '/#about');
      await trackPageView('/');
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({ page_path: '/#about' })
      );
    });

    it('does not double-append a hash already in the path', async () => {
      window.history.replaceState({}, '', '/#about');
      await trackPageView('/#about');
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({ page_path: '/#about' })
      );
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

    it('trackAnchorChange sends exactly one page_view', async () => {
      await trackAnchorChange('projects', 'about');
      const pageViewCalls = (window.gtag as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[1] === 'page_view'
      );
      expect(pageViewCalls).toHaveLength(1);
    });

    it('trackSectionView does not send its own page_view', async () => {
      await trackSectionView('projects');
      const pageViewCalls = (window.gtag as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[1] === 'page_view'
      );
      expect(pageViewCalls).toHaveLength(0);
    });

    it('one section transition (both functions called together) sends exactly one page_view', async () => {
      await trackAnchorChange('projects', 'about');
      await trackSectionView('projects');
      const pageViewCalls = (window.gtag as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[1] === 'page_view'
      );
      expect(pageViewCalls).toHaveLength(1);
    });
  });
});
