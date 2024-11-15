import React, { useState, useMemo } from 'react';
import { RouteObject, useLocation } from 'react-router-dom';
import MainContent from '../features/content/components/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { BackgroundProvider } from '../features/theme/components/background-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { useThemeBackground } from '../features/theme/hooks/use-theme-background';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import { useResume } from '../features/content/components/resume-provider';
import ChatPortal from '../features/content/components/ChatPortal';


import './styles/app.css';

const AppContent: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  const { isLoading, resumeData, error } = useResume();
  
  const location = useLocation();
  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);

  
  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <>
          <BackgroundProvider backgroundColor={backgroundColor}>
            {/* <ParticlesProvider config={baseConfig} isResumeLoaded={!isLoading}> */}
              <MainContent error={error} />

            {/* </ParticlesProvider> */}
          </BackgroundProvider>
          
          <ChatPortal />
          
        </>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

// Prevent unnecessary re-renders
const App = React.memo(AppContent);

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
