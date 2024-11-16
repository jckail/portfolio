import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../../shared/stores/theme-store';
import { Theme } from '../../types/theme';

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
        // Remove all theme classes
        document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-party');
        // Add new theme class
        document.documentElement.classList.add(`theme-${theme}`);
        // Set data attribute for CSS variables
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update meta theme-color tags
        const themeColors: Record<Theme, string> = {
          light: '#ffffff',
          dark: '#000000',
          party: '#ff00ff'
        };
        
        // Remove existing theme-color meta tags
        const existingMetaTags = document.querySelectorAll('meta[name="theme-color"]');
        existingMetaTags.forEach(tag => tag.remove());
        
        // Create and append new theme-color meta tag
        const metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        metaThemeColor.content = themeColors[theme];
        document.head.appendChild(metaThemeColor);
        
        // Force a repaint on iOS without affecting scroll position
        document.documentElement.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          document.documentElement.style.transform = '';
        });
        
        console.log('[Theme Provider] Applied theme:', theme);
      } catch (error) {
        console.error('[Theme Provider] Error applying theme:', error);
      }
    };

    // Apply theme immediately
    applyTheme();
  }, [theme]);

  return <>{children}</>;
}
