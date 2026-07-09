import React, { useEffect } from 'react';

import { Icon } from '@/shared/components/elements/icon';
import { Button } from '@/shared/components/elements/button';
import './modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Click-outside-to-close is a mouse-only affordance; keyboard users
    // close via Escape (handled above) or the close button.
    <div
      className="modal-overlay"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
      >
        {showCloseButton && (
          <Button
            variant="text"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="close" />
          </Button>
        )}
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
