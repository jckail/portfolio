import React, { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { BackgroundProvider } from '../features/theme/components/background-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { useThemeBackground } from '../features/theme/hooks/use-theme-background';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import ChatPortal from '../features/resume/components/ChatPortal';
import AdminHandler from '../features/admin/components/admin-handler';
import './styles/app.css';

const App: React.FC = () => {
  const { theme } = useThemeStore();
  const backgroundColor = useThemeBackground(theme);
  
  const baseConfig = useMemo(() => getThemeConfig(theme), [
    // Only recalculate when party mode changes
    theme === 'party'
  ]);

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <>
          <BackgroundProvider backgroundColor={backgroundColor}>
            <ParticlesProvider config={baseConfig}>
              <MainLayout>
                <MainContent />
              </MainLayout>
            </ParticlesProvider>
          </BackgroundProvider>
          <ChatPortal />
          <AdminHandler />
        </>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
