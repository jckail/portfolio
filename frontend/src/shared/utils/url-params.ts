/**
 * Helpers for reflecting UI state in URL query parameters.
 *
 * Centralizes the "set/remove a param, keep the hash intact, push or replace
 * history" dance that modals and panels use for deep linking.
 */

export function getQueryParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

export function setQueryParam(
  key: string,
  value: string | null,
  options: { replace?: boolean } = {}
): void {
  const url = new URL(window.location.href);

  if (value === null) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }

  // Rebuild with the hash appended exactly once
  const hash = window.location.hash;
  const withoutHash = url.toString().split('#')[0];
  const finalUrl = hash ? `${withoutHash}${hash}` : withoutHash;

  if (options.replace) {
    window.history.replaceState({}, '', finalUrl);
  } else {
    window.history.pushState({}, '', finalUrl);
  }
}
