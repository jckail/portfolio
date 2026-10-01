import { useEffect } from 'react';

/**
 * Invoke a callback when the Escape key is pressed.
 * Modal dialogs should pass their close handler to useFocusTrap instead, which
 * only reacts while the dialog is on top; this hook skips any Escape a dialog
 * already handled (marked with preventDefault).
 */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        onEscape();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}
