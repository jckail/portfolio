import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import CookieConsentPortal from './cookie-consent-portal';
import {
  COOKIE_CONSENT_KEY,
  openCookieSettings,
} from '../../utils/cookie-consent';

describe('CookieConsentPortal', () => {
  beforeEach(() => {
    localStorage.clear();
    window.gtag = vi.fn();
  });

  it('shows the banner until a choice is made', () => {
    render(<CookieConsentPortal />);
    fireEvent.click(screen.getByText('Deny All'));
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('denied');
    expect(screen.queryByText('Deny All')).toBeNull();
  });

  it('stays hidden when a choice is stored, and reopens from Cookie settings', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    render(<CookieConsentPortal />);
    expect(screen.queryByText('Deny All')).toBeNull();

    act(() => openCookieSettings());
    fireEvent.click(screen.getByText('Deny All'));
    // Withdrawal is persisted and GA is told immediately
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('denied');
    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ analytics_storage: 'denied' })
    );
  });
});
