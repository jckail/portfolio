import React, { useEffect } from 'react';

import { BLACK, WHITE } from '../../config/constants';
import { useThemeStore } from '../../shared/stores/theme-store';

import type { Theme } from '../../types/theme';

/** Browser UI color (<meta name="theme-color">) per theme. */
const THEME_COLORS: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#000000',
  party: '#ff00ff',
};

/** Page background behind the particles canvas (overscroll areas included). */
const THEME_BACKGROUNDS: Record<Theme, string> = {
  light: WHITE,
  dark: BLACK,
  party: BLACK,
};

/** Resolves the initial theme, then mirrors the store onto <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore(state => state.theme);
  const initTheme = useThemeStore(state => state.initTheme);

  // Initialize theme on mount (initTheme is idempotent, so StrictMode's
  // double effect run is harmless)
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('theme-light', 'theme-dark', 'theme-party');
      root.classList.add(`theme-${theme}`);
      // Data attribute for CSS variables
      root.setAttribute('data-theme', theme);
      root.style.backgroundColor = THEME_BACKGROUNDS[theme];

      // Replace the theme-color meta tags
      document.querySelectorAll('meta[name="theme-color"]').forEach(tag => tag.remove());
      const metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      metaThemeColor.content = THEME_COLORS[theme];
      document.head.appendChild(metaThemeColor);

      // Force a repaint on iOS without affecting scroll position
      root.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        root.style.transform = '';
      });
    } catch (error) {
      console.error('[Theme Provider] Error applying theme:', error);
    }
  }, [theme]);

  return <>{children}</>;
}
