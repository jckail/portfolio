import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOKIE_CONSENT_KEY } from '../../shared/utils/cookie-consent';
import Footer from './footer';

describe('Footer', () => {
  it.each([[null], ['accepted'], ['denied']])(
    'keeps navigation and omits cookie settings when consent is %s',
    (state) => {
      localStorage.clear();
      if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
      render(<Footer onDoodleToggle={vi.fn()} doodleClickCount={0} isPartyMode={false} />);
      expect(screen.queryByRole('button', { name: 'Cookie settings' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Click To Doodle with Dots' })).toBeTruthy();
      localStorage.clear();
    }
  );
});
