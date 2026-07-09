import React, { useMemo, useEffect, Suspense } from 'react';
import { RouteObject, useLocation } from 'react-router-dom';

import MainContent from './components/main-content';
import { ParticlesProvider } from './providers/particles-provider';
import { DataProvider } from './providers/data-provider';
import { ResumeProvider } from './providers/resume-provider';
import { useThemeStore } from '../shared/stores/theme-store';
import { useThemeBackground } from '../shared/hooks';
import { useKeyboardShortcuts } from '../shared/hooks/use-keyboard-shortcuts';
import { useEasterEggs } from '../shared/hooks/use-easter-eggs';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { initializeAnalytics, trackPageView, trackAnchorChange } from '../shared/utils/analytics';
import CookieConsentPortal from '../shared/components/cookie/cookie-consent-portal';
import { CommandPaletteHost } from '../shared/components/command-palette';
import ReadingProgress from '../shared/components/reading-progress';

import type { Theme } from '../types/theme';

import '../styles/base/app.css';

// Lazy load ChatPortal since it's not immediately needed
const ChatPortal = React.lazy(() => import('./components/chat/chat-portal'));

const App: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);
  const location = useLocation();

  useKeyboardShortcuts();
  useEasterEggs();

  useEffect(() => {
    const onSetTheme = (event: Event) => {
      const themeName = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      if (themeName === 'light' || themeName === 'dark' || themeName === 'party') {
        setTheme(themeName as Theme);
      }
    };
    const onParty = () => setTheme('party');
    window.addEventListener('portfolio:set-theme', onSetTheme);
    window.addEventListener('portfolio:party', onParty);
    return () => {
      window.removeEventListener('portfolio:set-theme', onSetTheme);
      window.removeEventListener('portfolio:party', onParty);
    };
  }, [setTheme]);

  useEffect(() => {
    // Initialize analytics on mount
    const initAnalytics = async () => {
      try {
        await initializeAnalytics();
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };
    initAnalytics();
  }, []);

  // Track both pathname and hash changes
  useEffect(() => {
    const trackNavigation = async () => {
      try {
        // Track page view with full path
        await trackPageView(location.pathname);
        
        // If there's a hash, track it as an anchor change
        if (location.hash) {
          const newAnchor = location.hash.slice(1); // Remove the # symbol
          await trackAnchorChange(newAnchor);
        }
      } catch (error) {
        console.error('Failed to track navigation:', error);
      }
    };
    trackNavigation();
  }, [location.pathname, location.hash]); // Track changes to both pathname and hash

  useEffect(() => {
    document.documentElement.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  return (
    <ErrorBoundary>
      <DataProvider>
        <ResumeProvider>
          <ParticlesProvider 
            config={baseConfig} 
            key={theme}
          >
            <div style={{ isolation: 'isolate' }}>
              <ReadingProgress />

              {/* Main content in its own error boundary */}
              <ErrorBoundary>
                <MainContent />
              </ErrorBoundary>

              {/* Chat portal lazy loaded */}
              <Suspense fallback={null}>
                <ChatPortal />
              </Suspense>

              <CookieConsentPortal />
              <CommandPaletteHost />
            </div>
          </ParticlesProvider>
        </ResumeProvider>
      </DataProvider>
    </ErrorBoundary>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/admin',
    element: <App />,
  }
];

export default App;
