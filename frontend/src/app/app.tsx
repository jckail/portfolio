import React, { useMemo, useEffect, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import MainContent from './components/main-content';
import { ParticlesProvider } from './providers/particles-provider';
import { DataProvider } from './providers/data-provider';
import { ResumeProvider } from './providers/resume-provider';
import { useThemeStore } from '../shared/stores/theme-store';
import { useThemeBackground } from '../shared/hooks';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';

import '../styles/base/app.css';

// Lazy load ChatPortal since it's not immediately needed
const ChatPortal = React.lazy(() => import('./components/chat').then(module => ({
  default: module.ChatPortal
})));

const App: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  return (
    <ErrorBoundary>
      <DataProvider>
        <ResumeProvider>
          <ParticlesProvider 
            config={baseConfig} 
            key={theme === 'party' ? Math.random() : theme}
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
