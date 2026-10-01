import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOKIE_CONSENT_KEY } from '../../shared/utils/cookie-consent';
import Footer from './footer';

describe('Footer cookie settings control', () => {
  it.each([[null], ['accepted'], ['denied']])('is present when consent is %s', (state) => {
    localStorage.clear();
    if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
    render(<Footer onDoodleToggle={vi.fn()} doodleClickCount={0} isPartyMode={false} />);
    expect(screen.getByRole('button', { name: 'Cookie settings' })).toBeTruthy();
    localStorage.clear();
  });
});
