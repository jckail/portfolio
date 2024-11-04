import React from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { particlesConfig } from '../features/theme/lib/particles/config';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import './styles/app.css';

const App: React.FC = () => {
  const theme = useThemeStore(state => state.theme);

  const updateParticlesConfig = () => {
    return particlesConfig[theme] as unknown as Record<string, unknown>;
  };

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
          <MainLayout>
            <MainContent />
          </MainLayout>
        </ParticlesProvider>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
