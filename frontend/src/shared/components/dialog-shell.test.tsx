import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { DialogShell } from './dialog-shell';

afterEach(() => cleanup());

const renderShell = (props: Partial<React.ComponentProps<typeof DialogShell>> = {}) => {
  const onClose = vi.fn();
  const utils = render(
    <div id="app-root">
      <h2 id="t">Title</h2>
      <DialogShell overlayClassName="ov" className="dlg" labelledBy="t" onClose={onClose} {...props}>
        <button type="button">Inside</button>
      </DialogShell>
    </div>
  );
  return { onClose, ...utils };
};

describe('DialogShell', () => {
  it('portals a labelled modal dialog to <body>', () => {
    const { container } = renderShell();
    const dialog = screen.getByRole('dialog', { name: 'Title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('dlg');
    expect(dialog.parentElement).toHaveClass('ov');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(container.querySelector('.dlg')).toBeNull();
  });

  it('closes on a backdrop click but not on a click inside', () => {
    const { onClose } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('.ov') as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Focus placement itself is covered by use-focus-trap.test.tsx (jsdom has
  // no layout, so offsetParent-based focusable detection needs stubbing).
  it('closes on Escape and moves focus into the dialog', () => {
    const { onClose } = renderShell();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the shared close button first when asked', () => {
    const { onClose } = renderShell({ closeButton: true });
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveClass('modal-close-button');
    expect(screen.getByRole('dialog').firstElementChild).toBe(close);
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports an aria-label instead of a visible title', () => {
    renderShell({ labelledBy: undefined, ariaLabel: 'Palette' });
    expect(screen.getByRole('dialog', { name: 'Palette' })).toBeInTheDocument();
  });
});
