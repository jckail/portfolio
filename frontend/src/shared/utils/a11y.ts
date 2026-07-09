import type React from 'react';

/**
 * Props that make a non-button element behave like an accessible button:
 * focusable, announced as a button, and activatable with Enter/Space.
 * Prefer a real <button> where styling allows; use this for styled
 * spans/divs that cannot easily be converted.
 */
export function buttonize(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
