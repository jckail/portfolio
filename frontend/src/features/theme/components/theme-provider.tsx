import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply theme to the document body
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  return <>{children}</>;
}
