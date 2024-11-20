import React, { useMemo, useEffect } from 'react';
import { RouteObject } from 'react-router-dom';
import MainContent from './components/layout/main-content';
import { ParticlesProvider } from './providers/particles-provider';
import { useThemeStore } from '../shared/stores/theme-store';
import { useThemeBackground } from '../shared/hooks';
import { getThemeConfig } from '../shared/utils/theme/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { useLoading, LoadingProvider } from '../shared/context/loading-context';
import { ChatPortal } from './components/chat';

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
        <>
          <ParticlesProvider config={baseConfig} key={theme === 'party' ? Math.random() : theme}>
            <MainContent />
          </ParticlesProvider>
          <ChatPortal />
        </>

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
