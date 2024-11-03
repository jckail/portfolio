import React, { useEffect } from 'react';
import { Icon } from './icon';
import { Button } from './button';
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal modal-${size}`}
        onClick={e => e.stopPropagation()}
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

// Usage example:
// <Modal
//   isOpen={isOpen}
//   onClose={handleClose}
//   title="Modal Title"
//   size="medium"
// >
//   <p>Modal content goes here</p>
// </Modal>
