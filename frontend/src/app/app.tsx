import React, { useMemo, useEffect, Suspense } from 'react';
import { RouteObject, useLocation } from 'react-router-dom';

import MainContent from './components/main-content';
import { ParticlesProvider } from './providers/particles-provider';
import { DataProvider } from './providers/data-provider';
import { ResumeProvider } from './providers/resume-provider';
import { useThemeStore } from '../shared/stores/theme-store';
import { useThemeBackground } from '../shared/hooks';
import { useKeyboardShortcuts } from '../shared/hooks/use-keyboard-shortcuts';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { initializeAnalytics, trackPageView, trackAnchorChange } from '../shared/utils/analytics';
import CookieConsentPortal from '../shared/components/cookie/cookie-consent-portal';

import '../styles/base/app.css';

// Lazy load ChatPortal since it's not immediately needed
const ChatPortal = React.lazy(() => import('./components/chat/chat-portal'));

const App: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);
  const location = useLocation();

  useKeyboardShortcuts();

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
              {/* Main content in its own error boundary */}
              <ErrorBoundary>
                <MainContent />
              </ErrorBoundary>

              {/* Chat portal lazy loaded */}
              <Suspense fallback={null}>
                <ChatPortal />
              </Suspense>

              <CookieConsentPortal />
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
