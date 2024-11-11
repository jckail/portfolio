import React, { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import { ErrorBoundary } from './components/error-boundary';
import { LoadingBoundary } from './components/loading-boundary';
import './styles/app.css';

// Array of available Zuni image numbers (2 through 19)
const ZUNI_IMAGE_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 2);

const App: React.FC = () => {
  const { theme } = useThemeStore();

  const baseConfig = useMemo(() => getThemeConfig(theme, 2), [
    // Only recalculate when party mode changes
    theme === 'party'
  ]);

  const overlayConfig = useMemo(() => 
    theme === 'party' 
      ? getThemeConfig(theme, 19)
      : baseConfig, 
    [theme === 'party']
  );

  return (
    <ErrorBoundary>
      <LoadingBoundary>
        <ParticlesProvider config={baseConfig}>
          <MainLayout>
            <MainContent />
            {theme === 'party' && (
              <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                pointerEvents: 'none', 
                zIndex: 1000 
              }}>
                <ParticlesProvider config={overlayConfig}>
                  <div />
                </ParticlesProvider>
              </div>
            )}
          </MainLayout>
        </ParticlesProvider>
      </LoadingBoundary>
    </ErrorBoundary>
  );
};

export default App;
