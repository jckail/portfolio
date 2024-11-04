import { RouteObject } from 'react-router-dom';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { particlesConfig } from '../features/theme/lib/particles/config';
import { useThemeStore } from '../features/theme/stores/theme-store';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);

  const updateParticlesConfig = () => {
    return particlesConfig[theme] as unknown as Record<string, unknown>;
  };

  return (
    <ParticlesProvider updateParticlesConfig={updateParticlesConfig}>
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
