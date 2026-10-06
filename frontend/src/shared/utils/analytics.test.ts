import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as analytics from './analytics';
import { COOKIE_CONSENT_KEY } from './cookie-consent';

describe('retired legacy analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.gtag = vi.fn();
  });
  it.each([null, 'accepted', 'denied', 'malformed'])(
    'all feature calls stay inert with saved state %s',
    async (state) => {
      if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
      const fetch = vi.spyOn(globalThis, 'fetch');
      const interval = vi.spyOn(globalThis, 'setInterval');
      await analytics.initializeAnalytics();
      await analytics.trackPageView('/?company=sabbatical');
      await analytics.trackAnchorChange('experience', 'about');
      await analytics.trackSectionView('experience');
      await analytics.trackModalView('sabbatical', 'experience', 'Sabbatical');
      await analytics.trackModalClose('sabbatical', 'experience', 1000);
      await analytics.trackThemeChange('dark', 'light');
      await analytics.trackSocialClick('github', 'visit', 'https://github.com/jckail');
      await analytics.trackResumeView('pdf', 'resume');
      await analytics.trackResumeDownload('pdf', 'current', 'resume');
      await analytics.trackChatOpen();
      await analytics.trackChatMessage('sent', 20);
      await analytics.trackContactOpened();
      await analytics.trackContactMessage(20);
      expect(analytics.getSessionId()).toBe('');
      expect(sessionStorage.getItem('ga_session_id')).toBeNull();
      expect(window.gtag).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(interval).not.toHaveBeenCalled();
      fetch.mockRestore();
      interval.mockRestore();
    }
  );
  it('works without storage or a GA global', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    // @ts-expect-error simulate no GA bootstrap
    window.gtag = undefined;
    await expect(analytics.trackPageView('/')).resolves.toBeUndefined();
    expect(analytics.getSessionId()).toBe('');
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });
});
