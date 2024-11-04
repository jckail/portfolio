import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme from URL on mount
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // Apply theme to the document root whenever theme changes
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <>{children}</>;
}
