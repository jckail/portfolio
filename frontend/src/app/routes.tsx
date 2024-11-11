import { RouteObject } from 'react-router-dom';
import { MainLayout } from '../features/layouts';
import MainContent from '../features/resume/components/main-content/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);

  return (
    <ParticlesProvider config={getThemeConfig(theme)}>
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
