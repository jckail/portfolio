import { RouteObject } from 'react-router-dom';
import { useMemo } from 'react';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);

  const config = useMemo(() => getThemeConfig(theme), [
    // Only recalculate when party mode changes
    theme === 'party'
  ]);

  return (
    <ParticlesProvider config={config}>
      <MainLayout>
        <MainContent />
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
