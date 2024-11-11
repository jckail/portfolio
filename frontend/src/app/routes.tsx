import { RouteObject } from 'react-router-dom';
import { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);

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
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppRoutes />,
  }
];
