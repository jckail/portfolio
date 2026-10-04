import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { useFocusTrap } from './use-focus-trap';
import { useEscapeKey } from './use-escape-key';
import { isScrollLocked } from './use-scroll-lock';
import { openDialogCount } from './dialog-stack';

const Dialog: React.FC<{ name: string; onClose: () => void; children?: React.ReactNode }> = ({
  name,
  onClose,
  children,
}) => {
  const ref = useFocusTrap(true, onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={name}>
      <button type="button">{name} button</button>
      {children}
    </div>
  );
};

/** An outer dialog that can open an inner one, like Experience -> Skill. */
const Stacked: React.FC<{ onOuterClose?: () => void; onInnerClose?: () => void }> = ({
  onOuterClose,
  onInnerClose,
}) => {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(true);
  return (
    <>
      {outer && (
        <Dialog
          name="outer"
          onClose={() => {
            onOuterClose?.();
            setOuter(false);
          }}
        />
      )}
      {inner && (
        <Dialog
          name="inner"
          onClose={() => {
            onInnerClose?.();
            setInner(false);
          }}
        />
      )}
    </>
  );
};

const pressEscape = () => fireEvent.keyDown(document.body, { key: 'Escape' });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('useFocusTrap escaped focus', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockReturnValue(document.body);
  });

  it('recovers the exact last control when focus escapes to the document body', async () => {
    render(<Dialog name="admin" onClose={() => {}}><input aria-label="Email" /></Dialog>);
    const email = screen.getByRole('textbox', { name: 'Email' });
    act(() => email.focus());
    act(() => email.blur());
    expect(document.activeElement).toBe(document.body);

    await act(async () => { await Promise.resolve(); });

    expect(document.activeElement).toBe(email);
  });

  it('preserves focus that moved to another control before recovery', async () => {
    render(<Dialog name="admin" onClose={() => {}}><input aria-label="Email" /></Dialog>);
    const email = screen.getByRole('textbox', { name: 'Email' });
    const button = screen.getByRole('button', { name: 'admin button' });
    act(() => { email.focus(); email.blur(); button.focus(); });

    await act(async () => { await Promise.resolve(); });

    expect(document.activeElement).toBe(button);
  });

  it('does not reclaim focus during an intra-dialog focus transition', async () => {
    render(<Dialog name="admin" onClose={() => {}}>
      <input aria-label="Email" /><input aria-label="Password" />
    </Dialog>);
    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByRole('textbox', { name: 'Password' });
    act(() => email.focus());
    const recoverFocus = vi.spyOn(email, 'focus');
    // Native focusout can run while activeElement is temporarily BODY. Its
    // relatedTarget still identifies the pending control inside the dialog.
    const activeElement = vi.spyOn(document, 'activeElement', 'get')
      .mockReturnValue(document.body);
    try {
      act(() => fireEvent.focusOut(email, { relatedTarget: password }));
      await act(async () => { await Promise.resolve(); });
      expect(recoverFocus).not.toHaveBeenCalled();
    } finally {
      activeElement.mockRestore();
    }
  });

  it('does not recover after closing, preserving the page opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    try {
      const view = render(<Dialog name="admin" onClose={() => {}}><input aria-label="Email" /></Dialog>);
      const email = screen.getByRole('textbox', { name: 'Email' });
      act(() => { email.focus(); email.blur(); });
      view.unmount();

      await act(async () => { await Promise.resolve(); });

      expect(document.activeElement).toBe(opener);
      expect(openDialogCount()).toBe(0);
    } finally {
      opener.remove();
    }
  });

  it('does not steal focus from a newly opened top dialog', async () => {
    const Fixture = ({ upper = false }) => (
      <>
        <Dialog name="admin" onClose={() => {}}><input aria-label="Email" /></Dialog>
        {upper && <Dialog name="confirmation" onClose={() => {}} />}
      </>
    );
    const view = render(<Fixture />);
    const email = screen.getByRole('textbox', { name: 'Email' });
    act(() => { email.focus(); email.blur(); });
    view.rerender(<Fixture upper />);
    const topButton = screen.getByRole('button', { name: 'confirmation button' });

    await act(async () => { await Promise.resolve(); });

    expect(document.activeElement).toBe(topButton);
    expect(screen.getByRole('dialog', { name: 'admin' })).toHaveAttribute('inert');
  });

  it('falls back when the remembered control was removed', async () => {
    const Fixture = ({ input = true }) => (
      <Dialog name="admin" onClose={() => {}}>{input && <input aria-label="Email" />}</Dialog>
    );
    const view = render(<Fixture />);
    const email = screen.getByRole('textbox', { name: 'Email' });
    act(() => { email.focus(); email.blur(); });
    view.rerender(<Fixture input={false} />);

    await act(async () => { await Promise.resolve(); });

    expect(email.isConnected).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'admin button' }));
  });

  it('falls back when the remembered control became disabled', async () => {
    render(<Dialog name="admin" onClose={() => {}}><input aria-label="Email" /></Dialog>);
    const email = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement;
    act(() => { email.focus(); email.blur(); email.disabled = true; });

    await act(async () => { await Promise.resolve(); });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'admin button' }));
  });
});

describe('useFocusTrap dialog stack', () => {
  it('lets only the top dialog handle Escape, closing stacked dialogs one at a time', () => {
    const onOuterClose = vi.fn();
    const onInnerClose = vi.fn();
    render(<Stacked onOuterClose={onOuterClose} onInnerClose={onInnerClose} />);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    pressEscape();
    expect(onInnerClose).toHaveBeenCalledTimes(1);
    expect(onOuterClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'inner' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'outer' })).toBeInTheDocument();

    pressEscape();
    expect(onOuterClose).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it('makes the dialogs underneath inert and restores them when the top one closes', () => {
    render(<Stacked />);
    const outer = screen.getByRole('dialog', { name: 'outer' });
    const inner = screen.getByRole('dialog', { name: 'inner' });
    expect(outer).toHaveAttribute('inert');
    expect(inner).not.toHaveAttribute('inert');

    pressEscape();
    expect(outer).not.toHaveAttribute('inert');
  });

  it('only traps Tab in the top dialog', () => {
    render(<Stacked />);
    const innerButton = screen.getByRole('button', { name: 'inner button', hidden: true });
    // jsdom has no layout, so the trap sees no visible focusables and parks
    // focus on the top container; the lower dialog must not steal it.
    act(() => innerButton.focus());
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(screen.getByRole('dialog', { name: 'inner' }).contains(document.activeElement)).toBe(true);
  });

  it('marks a handled Escape so plain useEscapeKey listeners skip it', () => {
    const pageEscape = vi.fn();
    const Page = () => {
      useEscapeKey(pageEscape);
      return <Dialog name="only" onClose={() => {}} />;
    };
    render(<Page />);
    pressEscape();
    expect(pageEscape).not.toHaveBeenCalled();
  });

  it('holds the scroll lock until the last stacked dialog closes', () => {
    render(<Stacked />);
    expect(isScrollLocked()).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    pressEscape();
    expect(isScrollLocked()).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    pressEscape();
    expect(isScrollLocked()).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(openDialogCount()).toBe(0);
  });

  it('releases everything when a dialog unmounts without Escape', () => {
    const { unmount } = render(<Dialog name="only" onClose={() => {}} />);
    expect(openDialogCount()).toBe(1);
    unmount();
    expect(openDialogCount()).toBe(0);
    expect(isScrollLocked()).toBe(false);
  });

  it('keeps focus in the top dialog when navigation removes a background dialog', () => {
    const visible = vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get')
      .mockImplementation(() => document.body);
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const Fixture = ({ lower = true, upper = false }) => (
      <>
        {lower && <Dialog name="skill" onClose={() => {}} />}
        {upper && <Dialog name="admin" onClose={() => {}} />}
      </>
    );

    try {
      const view = render(<Fixture />);
      view.rerender(<Fixture upper />);
      const adminButton = screen.getByRole('button', { name: 'admin button' });
      expect(document.activeElement).toBe(adminButton);

      view.rerender(<Fixture lower={false} upper />);

      expect(document.activeElement).toBe(adminButton);
      expect(openDialogCount()).toBe(1);
      expect(isScrollLocked()).toBe(true);
      expect(screen.getByRole('dialog', { name: 'admin' })).not.toHaveAttribute('inert');
      view.unmount();
    } finally {
      visible.mockRestore();
      opener.remove();
    }
  });

  it('restores the page opener when the only dialog closes', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    try {
      const view = render(<Dialog name="only" onClose={() => {}} />);
      view.unmount();
      expect(document.activeElement).toBe(opener);
      expect(openDialogCount()).toBe(0);
      expect(isScrollLocked()).toBe(false);
    } finally {
      opener.remove();
    }
  });
});
