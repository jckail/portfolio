import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { useSectionStore } from '../../stores/section-store';
import SidePanel from './side-panel';

vi.mock('../../utils/scroll-utils', () => ({ scrollToSection: vi.fn() }));

// jsdom has no layout, so offsetParent is always null; the trap filters on it.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get() {
    return this.parentNode;
  },
});

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

const Harness: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={toggleRef} className="menu-toggle" onClick={() => setOpen(o => !o)}>
        menu
      </button>
      <button>outside</button>
      <SidePanel isOpen={open} onClose={() => setOpen(false)} returnFocusRef={toggleRef} />
    </>
  );
};

const openDrawer = () => {
  const toggle = screen.getByText('menu');
  toggle.focus();
  fireEvent.click(toggle);
  return toggle;
};

describe('SidePanel focus management', () => {
  it('is inert while closed and moves focus to the first item on open', () => {
    const { container } = render(<Harness />);
    const nav = container.querySelector('#side-panel')!;
    expect(nav).toHaveAttribute('inert');
    openDrawer();
    expect(nav).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(screen.getByText('About'));
  });

  it('wraps Tab and Shift+Tab inside the open drawer', () => {
    render(<Harness />);
    openDrawer();
    screen.getByText('Resume').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('About'));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText('Resume'));
  });

  it('pulls focus back in when it is outside the drawer', () => {
    render(<Harness />);
    openDrawer();
    screen.getByText('outside').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('About'));
  });

  it('closes on Escape and returns focus to the menu toggle', () => {
    const { container } = render(<Harness />);
    const toggle = openDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('#side-panel')).not.toHaveClass('open');
    expect(document.activeElement).toBe(toggle);
  });

  it('returns focus to the toggle after choosing a section', () => {
    render(<Harness />);
    const toggle = openDrawer();
    fireEvent.click(screen.getByText('Skills'));
    expect(document.activeElement).toBe(toggle);
  });
});

describe('SidePanel current location', () => {
  it('announces the active section rather than relying on its highlight', () => {
    useSectionStore.setState({ currentSection: 'projects' });
    render(<SidePanel isOpen onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('button', { name: 'About' })).not.toHaveAttribute('aria-current');
  });
});
