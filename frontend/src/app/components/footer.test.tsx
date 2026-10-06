import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOKIE_CONSENT_KEY } from '../../shared/utils/cookie-consent';
import Footer from './footer';

describe('Footer without consent controls', () => {
  it.each([[null], ['accepted'], ['denied']])(
    'has no consent controls when saved consent is %s',
    (state) => {
      localStorage.clear();
      if (state) localStorage.setItem(COOKIE_CONSENT_KEY, state);
      render(<Footer onDoodleToggle={vi.fn()} doodleClickCount={0} isPartyMode={false} />);
      expect(screen.queryByRole('button', { name: 'Cookie settings' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeTruthy();
      localStorage.clear();
    }
  );
});
