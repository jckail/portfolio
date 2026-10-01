import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

import AdminLogin from './admin-login';
import { isScrollLocked } from '../../../shared/hooks/use-scroll-lock';

afterEach(() => cleanup());

const noop = () => {};

describe('AdminLogin', () => {
  it('is a labelled modal dialog with labelled fields', () => {
    render(<AdminLogin isOpen onClose={noop} onLoginSuccess={noop} />);
    const dialog = screen.getByRole('dialog', { name: 'Admin Login' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(isScrollLocked()).toBe(true);
  });

  it('closes on Escape and on a backdrop click', () => {
    const onClose = vi.fn();
    render(<AdminLogin isOpen onClose={onClose} onLoginSuccess={noop} />);

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing while closed', () => {
    render(<AdminLogin isOpen={false} onClose={noop} onLoginSuccess={noop} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isScrollLocked()).toBe(false);
  });

  it('never shows two copies, and hands over when the first one closes', () => {
    let closeFirst = noop;
    const Host = () => {
      const [first, setFirst] = useState(true);
      closeFirst = () => setFirst(false);
      return (
        <>
          <AdminLogin isOpen={first} onClose={() => setFirst(false)} onLoginSuccess={noop} />
          <AdminLogin isOpen onClose={noop} onLoginSuccess={noop} />
        </>
      );
    };
    render(<Host />);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    act(() => closeFirst());
    // The second copy was also asked to open, so it takes over
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
