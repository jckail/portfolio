import { useEffect, useRef } from 'react';

import { scrollToSection } from '../utils/scroll-utils';
import { setQueryParam } from '../utils/url-params';

interface DeepLinkOptions {
  /** URL parameter that carries the deep link (e.g. "project"). */
  param: string;
  /** Current value of that parameter (from useUrlParamState). */
  value: string | null;
  /** True once the data the value refers to has loaded. */
  ready: boolean;
  /** Whether `value` names something that exists. */
  valid: boolean;
  /** Section to scroll to when the link resolves. */
  sectionId: string;
  /** Resets the owning state to null. */
  clear: () => void;
}

/**
 * Handles a deep link (?project=, ?company=) that was present on page load,
 * once, after the data is ready:
 * - resolved: scroll to the section the modal belongs to, so the page behind
 *   the dialog matches the URL;
 * - unresolvable: drop the dead parameter (replacing, not pushing, history so
 *   Back cannot return to it).
 * Later opens by clicking are not deep links and are left alone.
 */
export function useDeepLink({ param, value, ready, valid, sectionId, clear }: DeepLinkOptions) {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !ready) return;
    handled.current = true;
    if (value === null) return;
    if (valid) {
      scrollToSection(sectionId);
    } else {
      setQueryParam(param, null, { replace: true });
      clear();
    }
  }, [ready, value, valid, param, sectionId, clear]);
}
