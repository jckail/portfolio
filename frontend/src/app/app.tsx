import React from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import getParticlesConfig from '../features/theme/lib/particles/config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import './styles/app.css';

const App: React.FC = () => {
  // Use a single config that works for both themes, cast to expected type
  const updateParticlesConfig = () => getParticlesConfig() as unknown as Record<string, unknown>;

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
