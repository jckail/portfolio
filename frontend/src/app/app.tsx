import React from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import getParticlesConfig from '../features/theme/lib/particles/config';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { PRIMARY } from '../config/constants';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import './styles/app.css';
import type { Theme } from '../features/theme/stores/theme-store';
import type { ParticlesConfig } from '../features/theme/lib/particles/types';

const App: React.FC = () => {
  const { theme } = useThemeStore();

  // Get the correct particles config based on current theme
  const getThemeConfig = (): Record<string, unknown> => {
    const configs: Record<Theme, ParticlesConfig> = {
      light: getParticlesConfig({
        particleColor: PRIMARY,
        lineColor: PRIMARY
      }),
      dark: getParticlesConfig({
        particleColor: '#0000ff',
        lineColor: '#0000ff'
      }),
      party: getParticlesConfig({
        particleColor: '#ff00ff',
        lineColor: '#ff00ff',
        particleCount: 50,
        particleSize: 2,
        lineDistance: 150,
        lineWidth: 3,
        moveSpeed: 1,
        bubbleSize: 12,
        bubbleSpeed: 8
      })
    };

    return configs[theme] as unknown as Record<string, unknown>;
  };

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <ParticlesProvider config={getThemeConfig()}>
          <MainLayout>
            <MainContent />
          </MainLayout>
        </ParticlesProvider>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
