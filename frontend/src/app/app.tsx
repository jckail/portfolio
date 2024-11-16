import React, { useMemo, useEffect } from 'react';
import { RouteObject } from 'react-router-dom';
import MainContent from '../features/content/components/main-content';
import { ParticlesProvider } from '../features/content/components/particles-provider';
import { useThemeStore } from '../features/content/stores/theme-store';
import { useThemeBackground } from '../features/content/hooks';
import { getThemeConfig } from '../features/content/lib';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import { useLoading, LoadingProvider } from '../features/content/context/loading-context';
import ChatPortal from '../features/content/components/ChatPortal';

import './styles/app.css';

const AppContent: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const { isFullyLoaded } = useLoading();
  
  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <>
          <ParticlesProvider config={baseConfig} isResumeLoaded={isFullyLoaded}>
            <MainContent />
          </ParticlesProvider>
          <ChatPortal />
        </>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

// Prevent unnecessary re-renders
const App = React.memo(() => (
  <LoadingProvider>
    <AppContent />
  </LoadingProvider>
));

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
