import React from 'react';
import { AppLogicProvider } from '@/app/providers/app-logic-provider';
import { ResumeProvider } from '@/features/resume/components/resume-provider';
import { MainLayout } from '@/features/layouts';
import MainContent from '@/features/resume/components/main-content/main-content';
import { ParticlesProvider } from '@/features/theme/components/particles-provider';
import { particlesConfig } from '@/features/theme/lib/particles';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import './styles/app.css';

const App: React.FC = () => {
  const updateParticlesConfig = () => ({
    ...particlesConfig,
    particles: {
      ...particlesConfig.particles,
      color: {
        value: document.documentElement.dataset.theme === 'dark' ? '#ffffff' : '#000000'
      },
      line_linked: {
        ...particlesConfig.particles.line_linked,
        color: document.documentElement.dataset.theme === 'dark' ? '#ffffff' : '#000000'
      }
    }
  });

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <AppLogicProvider>
          <ResumeProvider>
            <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
              <MainLayout>
                <MainContent />
              </MainLayout>
            </ParticlesProvider>
          </ResumeProvider>
        </AppLogicProvider>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
