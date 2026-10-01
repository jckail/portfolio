import React from 'react';
import { createPortal } from 'react-dom';

import { useFocusTrap } from '../hooks/use-focus-trap';

interface DialogShellProps {
  /** Class of the full-viewport backdrop; a click on it (not its content) closes. */
  overlayClassName: string;
  /** Class of the role="dialog" element. */
  className: string;
  onClose: () => void;
  /** Id of the visible title. Use this or `ariaLabel`. */
  labelledBy?: string;
  ariaLabel?: string;
  /** Renders the shared "×" close button as the dialog's first child. */
  closeButton?: boolean;
  /** For dialogs that stay mounted while hidden (focus trap follows it). */
  active?: boolean;
  children: React.ReactNode;
}

/**
 * The modal frame every dialog shares: portaled to <body> (so it stacks above
 * the cookie banner and chat launcher, which are body-level too; nothing
 * inside #root can z-index past them), a backdrop that closes on click, and
 * useFocusTrap for Tab containment, Escape, scroll lock and dialog stacking.
 */
export const DialogShell: React.FC<DialogShellProps> = ({
  overlayClassName,
  className,
  onClose,
  labelledBy,
  ariaLabel,
  closeButton = false,
  active = true,
  children,
}) => {
  const trapRef = useFocusTrap(active, onClose);

  return createPortal(
    <div
      className={overlayClassName}
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
      >
        {closeButton && (
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default DialogShell;
