import { RouteObject } from 'react-router-dom';
import { useMemo } from 'react';
import MainContent from '../features/content/components/main-content';
import { ParticlesProvider } from '../features/theme/components/particles-provider';
import { useThemeStore } from '../features/theme/stores/theme-store';
import { getThemeConfig } from '../features/theme/lib/get-theme-config';
import AdminLogin from '../features/content/components/admin-login';
import { useState } from 'react';
import { useResume } from '../features/content/components/resume-provider';

const AppRoutes = () => {
  const theme = useThemeStore(state => state.theme);
  
  const { resumeData, error } = useResume();

  const baseConfig = useMemo(() => getThemeConfig(theme), [theme]);



  return (
    <ParticlesProvider config={baseConfig}>
      <MainContent error={error} />
    </ParticlesProvider>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppRoutes />,
  },
  {
    path: '/admin',
    element: <AppRoutes />,
  }
];
