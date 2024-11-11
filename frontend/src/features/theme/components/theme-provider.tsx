import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../stores/theme-store';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, initTheme } = useThemeStore();
  const isInitialized = useRef(false);

  // Initialize theme on mount
  useEffect(() => {
    if (!isInitialized.current) {
      initTheme();
      isInitialized.current = true;
    }
  }, [initTheme]);

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      try {
        // Remove existing theme class
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        // Add new theme class
        document.documentElement.classList.add(`theme-${theme}`);
        // Set data attribute for CSS variables
        document.documentElement.setAttribute('data-theme', theme);
        
        // Force a repaint to ensure styles are applied immediately
        document.documentElement.style.display = 'none';
        void document.documentElement.offsetHeight;
        document.documentElement.style.display = '';
        
        console.log('[Theme Provider] Applied theme:', theme);
      } catch (error) {
        console.error('[Theme Provider] Error applying theme:', error);
      }
    };

    // Apply theme immediately
    applyTheme();

    // Add a small delay to ensure transitions work properly on mobile
    const timeoutId = setTimeout(applyTheme, 50);
    return () => clearTimeout(timeoutId);
  }, [theme]);

  return <>{children}</>;
}
