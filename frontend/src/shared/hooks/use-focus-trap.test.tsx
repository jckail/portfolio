import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
  document.documentElement.style.overflow = '';
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
});
