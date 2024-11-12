import React, { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import ChatPortal from '../features/resume/components/ChatPortal';
import './styles/app.css';

const App: React.FC = () => {
  const { theme } = useThemeStore();

  const baseConfig = useMemo(() => getThemeConfig(theme), [
    // Only recalculate when party mode changes
    theme === 'party'
  ]);

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <>
          <ParticlesProvider config={baseConfig}>
            <MainLayout>
              <MainContent />
            </MainLayout>
          </ParticlesProvider>
          <ChatPortal />
        </>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
