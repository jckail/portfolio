import { useSyncExternalStore } from 'react';

/**
 * The page's pathname, search and hash, re-read on back/forward and fragment
 * navigations (popstate / hashchange).
 *
 * Replaces react-router's BrowserRouter + useLocation, which was ~16 KB of
 * gzip on the critical path for this one hook: the site has a single page
 * plus /admin, and never navigates through a router. Like BrowserRouter, it
 * does not observe history.pushState/replaceState calls (scroll-spy's
 * replaceState must not re-run the effects that read the location).
 */
export interface PageLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

let snapshot: PageLocation | null = null;
let subscribers = 0;

function readLocation(): PageLocation {
  const { pathname, search, hash } = window.location;
  if (!snapshot || snapshot.pathname !== pathname || snapshot.search !== search || snapshot.hash !== hash) {
    snapshot = { pathname, search, hash };
  }
  return snapshot;
}

// While nothing is subscribed no event updates the snapshot, so a component
// that mounts later reads the URL as it is then.
function getSnapshot(): PageLocation {
  return subscribers === 0 || !snapshot ? readLocation() : snapshot;
}

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    readLocation();
    onChange();
  };
  subscribers += 1;
  window.addEventListener('popstate', handler);
  window.addEventListener('hashchange', handler);
  return () => {
    subscribers -= 1;
    window.removeEventListener('popstate', handler);
    window.removeEventListener('hashchange', handler);
  };
}

export function useLocation(): PageLocation {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
