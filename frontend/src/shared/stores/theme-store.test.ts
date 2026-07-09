import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useThemeStore } from './theme-store';

// Analytics calls network/gtag; stub it out for unit tests
vi.mock('../utils/analytics', () => ({
  trackThemeChange: vi.fn(),
}));

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    // Earlier tests write ?theme= into the URL; reset it so initTheme
    // exercises the localStorage fallback
    window.history.replaceState({}, '', '/');
    useThemeStore.setState({
      theme: 'dark',
      clickCount: 0,
      lastClickTime: 0,
      isToggleHidden: false,
    });
  });

  it('toggles between light and dark', () => {
    const { toggleTheme } = useThemeStore.getState();
    expect(useThemeStore.getState().theme).toBe('dark');

    toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists the preference to localStorage', () => {
    useThemeStore.getState().setTheme('light');
    expect(localStorage.getItem('portfolio-theme-preference')).toBe('light');
  });

  it('activates party mode after rapid toggling and hides the toggle temporarily', () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 10; i++) {
        useThemeStore.getState().toggleTheme();
      }
      expect(useThemeStore.getState().theme).toBe('party');
      expect(useThemeStore.getState().isToggleHidden).toBe(true);

      vi.advanceTimersByTime(10000);
      expect(useThemeStore.getState().isToggleHidden).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('initTheme falls back to stored preference', () => {
    localStorage.setItem('portfolio-theme-preference', 'light');
    useThemeStore.getState().initTheme();
    expect(useThemeStore.getState().theme).toBe('light');
  });
});
