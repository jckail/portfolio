import { useEffect } from 'react';

import { setQueryParam } from '../utils/url-params';
import { scrollToSection } from '../utils/scroll-utils';

/**
 * Global shortcuts (ignored while typing in inputs):
 *   ? or /  → open AI chat
 *   g then e/p/s/r/a → jump to Experience / Projects / Skills / Resume / About
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === '?' || key === '/') {
        event.preventDefault();
        setQueryParam('ai_chat', 'open');
        window.dispatchEvent(new PopStateEvent('popstate'));
        pendingG = false;
        return;
      }

      if (key === 'g') {
        pendingG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }

      if (pendingG) {
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        const map: Record<string, string> = {
          a: 'about',
          e: 'experience',
          p: 'projects',
          s: 'skills',
          r: 'resume',
        };
        const section = map[key];
        if (section) {
          event.preventDefault();
          scrollToSection(section);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (gTimer) clearTimeout(gTimer);
    };
  }, []);
}
