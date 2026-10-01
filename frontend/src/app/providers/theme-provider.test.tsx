import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeStore } from '../../shared/stores/theme-store';
import { ThemeProvider } from './theme-provider';

describe('ThemeProvider', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.className = '';
  });

  const flushFrames = () => {
    while (frames.length) frames.shift()!(performance.now());
  };

  it('applies the theme with transitions suspended, then restores them', () => {
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>
    );
    flushFrames();
    const root = document.documentElement;
    expect(root.classList.contains('no-transition')).toBe(false);

    const next = useThemeStore.getState().theme === 'light' ? 'dark' : 'light';
    act(() => useThemeStore.getState().setTheme(next));

    expect(root.getAttribute('data-theme')).toBe(next);
    expect(root.classList.contains(`theme-${next}`)).toBe(true);
    expect(root.classList.contains('no-transition')).toBe(true);

    flushFrames();
    expect(root.classList.contains('no-transition')).toBe(false);
  });

  it('does not leave transitions disabled when unmounted mid-switch', () => {
    const { unmount } = render(
      <ThemeProvider>
        <span />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('no-transition')).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains('no-transition')).toBe(false);
  });
});
