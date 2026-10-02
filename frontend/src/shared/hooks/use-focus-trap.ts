import { useEffect, useRef } from 'react';

import { isTopDialog, pushDialog, removeDialog } from './dialog-stack';
import { useScrollLock } from './use-scroll-lock';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog behaviour for a container while `active`:
 * - traps Tab focus inside it and restores focus on cleanup,
 * - locks page scroll (reference-counted, see useScrollLock),
 * - calls `onEscape` on Escape,
 * all only while it is the top dialog, so stacked dialogs close one at a time.
 */
export function useFocusTrap(active: boolean, onEscape?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useScrollLock(active);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = containerRef.current;
    if (!node) return;

    const id = Symbol('dialog');
    pushDialog(id, node);

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null
      );

    // Focus the first interactive element, or the container itself
    const initial = focusables()[0] ?? node;
    if (!node.hasAttribute('tabindex')) {
      node.tabIndex = -1;
    }
    initial.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(id)) return;

      if (event.key === 'Escape') {
        if (onEscapeRef.current) {
          // Mark it handled so plain useEscapeKey listeners ignore it
          event.preventDefault();
          onEscapeRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (!node.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase: runs before any bubble-phase document listener
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const wasTopDialog = isTopDialog(id);
      removeDialog(id);
      // A background dialog can close on navigation while another remains
      // open. Its opener must not steal focus from that top dialog.
      if (wasTopDialog) {
        previouslyFocused.current?.focus?.({ preventScroll: true });
      }
    };
  }, [active]);

  return containerRef;
}
