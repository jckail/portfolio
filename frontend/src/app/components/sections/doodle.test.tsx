import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import Doodle from './doodle';

// jsdom has no canvas; the board only needs getContext to not throw
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Doodle', () => {
  it('is inert while hidden so its Clear button is not focusable', () => {
    const { container, rerender } = render(<Doodle isVisible={false} isPartyMode={false} />);
    const section = container.querySelector('#doodle')!;
    expect(section).toHaveAttribute('inert');

    rerender(<Doodle isVisible isPartyMode={false} />);
    expect(section).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});
