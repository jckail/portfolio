import { useEffect } from 'react';

import { CONSENT_CHANGE_EVENT, hasAnalyticsConsent } from '../utils/cookie-consent';
import { flush, reset, track } from './core';
import { isAnalyticsEvent } from './events';
import { startTracker } from './tracker';

/**
 * The single mount point for product analytics. Observers run only while the
 * visitor has accepted analytics; withdrawing (or denying) detaches them and
 * empties the send queue immediately. Components may also report an event with
 * `window.dispatchEvent(new CustomEvent('portfolio:track', {detail:{event, props}}))`
 * or the `data-track-event` attribute (see tracker.ts).
 */
export function useAnalyticsTracker(): void {
  useEffect(() => {
    let stop: (() => void) | null = null;

    const sync = () => {
      if (hasAnalyticsConsent()) {
        if (!stop) stop = startTracker();
      } else if (stop) {
        stop();
        stop = null;
        reset();
      }
    };

    const onTrack = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: unknown; props?: Record<string, unknown> }>).detail;
      if (detail && isAnalyticsEvent(detail.event)) track(detail.event, detail.props);
    };

    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('portfolio:track', onTrack);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('portfolio:track', onTrack);
      if (stop) {
        flush();
        stop();
      }
    };
  }, []);
}
