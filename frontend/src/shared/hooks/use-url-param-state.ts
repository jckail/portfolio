import { useState, useEffect } from 'react';

import { getQueryParam, setQueryParam } from '../utils/url-params';

/**
 * React state mirrored into a URL query parameter.
 *
 * - Initializes from the current URL (deep links work)
 * - Writes state changes to the URL, preserving the hash
 * - Follows browser back/forward navigation
 *
 * The returned setter accepts `null` to remove the parameter.
 */
export function useUrlParamState(
  key: string
): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => getQueryParam(key));

  useEffect(() => {
    if (getQueryParam(key) !== value) {
      setQueryParam(key, value);
    }
  }, [key, value]);

  useEffect(() => {
    const handlePopState = () => setValue(getQueryParam(key));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [key]);

  return [value, setValue];
}
